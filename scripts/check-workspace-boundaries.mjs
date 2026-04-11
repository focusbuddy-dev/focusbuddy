import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFilePath = fileURLToPath(import.meta.url);
const defaultRepoRoot = resolve(dirname(scriptFilePath), '..');
const codeFileExtensions = new Set([
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const dependencyFieldNames = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const ignoredDirectoryNames = new Set([
  '.git',
  '.next',
  '.turbo',
  '.worktrees',
  'coverage',
  'dist',
  'generated',
  '__generated__',
  'node_modules',
]);
const specifierPattern =
  /\b(?:import|export)\s+(?:[^'"`]*?\s+from\s+)?['"]([^'"`]+)['"]|\bimport\s*\(\s*['"]([^'"`]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"`]+)['"]\s*\)|\bjest\.(?:mock|unstable_mockModule)\s*\(\s*['"]([^'"`]+)['"]\s*/g;
const tsconfigFilePattern = /^tsconfig(?:\.[^.]+)?\.json$/;

function normalizeForDisplay(targetPath, repoRoot) {
  return relative(repoRoot, targetPath).split(sep).join('/');
}

function isInsidePath(candidatePath, containerPath) {
  return candidatePath === containerPath || candidatePath.startsWith(`${containerPath}${sep}`);
}

function findWorkspaceForPath(workspaces, candidatePath) {
  return workspaces.find((workspace) => isInsidePath(candidatePath, workspace.rootPath));
}

function escapeRegularExpression(sourceText) {
  return sourceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getWorkspaceNameFromSpecifier(specifier) {
  if (!specifier.startsWith('@focusbuddy/')) {
    return undefined;
  }

  const parts = specifier.split('/');

  if (parts.length < 2) {
    return undefined;
  }

  return `${parts[0]}/${parts[1]}`;
}

function extractImportSpecifiers(sourceText) {
  const specifiers = [];

  for (const match of sourceText.matchAll(specifierPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3] ?? match[4];

    if (specifier) {
      specifiers.push(specifier);
    }
  }

  return specifiers;
}

function getTsconfigExtendsSpecifiers(configJson) {
  const extendsField = configJson.extends;

  if (typeof extendsField === 'string') {
    return [extendsField];
  }

  if (Array.isArray(extendsField)) {
    return extendsField.filter((value) => typeof value === 'string');
  }

  return [];
}

function getDeclaredWorkspaceDependencies(packageJson) {
  const dependencyMap = new Map();

  for (const fieldName of dependencyFieldNames) {
    const section = packageJson[fieldName];

    if (!section) {
      continue;
    }

    for (const dependencyName of Object.keys(section)) {
      dependencyMap.set(dependencyName, fieldName);
    }
  }

  return dependencyMap;
}

function getExportEntries(packageJson) {
  if (packageJson.exports === undefined) {
    if (packageJson.main || packageJson.module || packageJson.types) {
      return [{ key: '.', value: true }];
    }

    return [];
  }

  if (
    typeof packageJson.exports !== 'object' ||
    packageJson.exports === null ||
    Array.isArray(packageJson.exports)
  ) {
    return [{ key: '.', value: packageJson.exports }];
  }

  const subpathKeys = Object.keys(packageJson.exports).filter((key) => key.startsWith('.'));

  if (subpathKeys.length > 0) {
    return subpathKeys.map((key) => ({ key, value: packageJson.exports[key] }));
  }

  return [{ key: '.', value: packageJson.exports }];
}

function isSpecifierAllowedByExports(targetWorkspace, specifier) {
  if (targetWorkspace.exportEntries.length === 0) {
    return targetWorkspace.name === specifier;
  }

  return targetWorkspace.exportEntries.some((entry) => {
    if (entry.value === null) {
      return false;
    }

    if (entry.key === '.') {
      return specifier === targetWorkspace.name;
    }

    const exportSubpath = entry.key.startsWith('./') ? entry.key.slice(2) : entry.key;
    const pattern = escapeRegularExpression(exportSubpath).replace(/\\\*/g, '.*');
    const specifierPatternText = `^${escapeRegularExpression(targetWorkspace.name)}/${pattern}$`;

    return new RegExp(specifierPatternText).test(specifier);
  });
}

function formatAllowedSubpaths(targetWorkspace) {
  if (targetWorkspace.exportEntries.length === 0) {
    return targetWorkspace.name;
  }

  const allowedSpecifiers = targetWorkspace.exportEntries
    .filter((entry) => entry.value !== null)
    .map((entry) => {
      if (entry.key === '.') {
        return targetWorkspace.name;
      }

      return `${targetWorkspace.name}/${entry.key.slice(2)}`;
    });

  return allowedSpecifiers.join(', ');
}

async function loadJson(jsonFilePath) {
  return JSON.parse(await readFile(jsonFilePath, 'utf8'));
}

async function discoverWorkspaces(repoRoot) {
  const workspaces = [];

  for (const segment of ['apps', 'packages']) {
    const segmentPath = resolve(repoRoot, segment);
    const entries = await readdir(segmentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const workspaceRoot = resolve(segmentPath, entry.name);
      const packageJsonPath = resolve(workspaceRoot, 'package.json');
      const packageJson = await loadJson(packageJsonPath);

      workspaces.push({
        category: segment === 'apps' ? 'app' : 'package',
        declaredWorkspaceDependencies: getDeclaredWorkspaceDependencies(packageJson),
        exportEntries: getExportEntries(packageJson),
        name: packageJson.name,
        packageJson,
        packageJsonPath,
        rootPath: workspaceRoot,
      });
    }
  }

  return workspaces.toSorted((left, right) => right.rootPath.length - left.rootPath.length);
}

async function collectWorkspaceFiles(rootPath) {
  const files = [];
  const queue = [rootPath];

  while (queue.length > 0) {
    const currentPath = queue.pop();
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = resolve(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          queue.push(entryPath);
        }

        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = entry.name.includes('.')
        ? entry.name.slice(entry.name.lastIndexOf('.'))
        : '';

      if (codeFileExtensions.has(extension) || tsconfigFilePattern.test(entry.name)) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function validateWorkspaceDependency({ fromWorkspace, repoRoot, targetWorkspace }) {
  if (targetWorkspace.name === fromWorkspace.name) {
    return undefined;
  }

  if (fromWorkspace.category === 'app' && targetWorkspace.category === 'app') {
    return `${normalizeForDisplay(fromWorkspace.packageJsonPath, repoRoot)}: ${fromWorkspace.name} must not depend on app workspace ${targetWorkspace.name}.`;
  }

  if (fromWorkspace.category === 'package' && targetWorkspace.category === 'app') {
    return `${normalizeForDisplay(fromWorkspace.packageJsonPath, repoRoot)}: ${fromWorkspace.name} must not depend on app workspace ${targetWorkspace.name}.`;
  }

  return undefined;
}

function validateWorkspaceSpecifier({
  fromWorkspace,
  repoRoot,
  sourceFilePath,
  specifier,
  targetWorkspace,
}) {
  const sourceLabel = normalizeForDisplay(sourceFilePath, repoRoot);
  const dependencyViolation = validateWorkspaceDependency({
    fromWorkspace,
    repoRoot,
    targetWorkspace,
  });

  if (dependencyViolation) {
    return `${sourceLabel}: ${fromWorkspace.name} must not import ${specifier}.`;
  }

  if (
    targetWorkspace.name !== fromWorkspace.name &&
    !fromWorkspace.declaredWorkspaceDependencies.has(targetWorkspace.name)
  ) {
    return `${sourceLabel}: ${fromWorkspace.name} imports ${specifier} but does not declare ${targetWorkspace.name} in package.json.`;
  }

  if (!isSpecifierAllowedByExports(targetWorkspace, specifier)) {
    return `${sourceLabel}: ${specifier} is not an allowed export of ${targetWorkspace.name}. Allowed specifiers: ${formatAllowedSubpaths(targetWorkspace)}.`;
  }

  return undefined;
}

async function checkPackageJsonDependencies(workspaces, repoRoot) {
  const violations = [];
  const workspaceByName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));

  for (const workspace of workspaces) {
    for (const dependencyName of workspace.declaredWorkspaceDependencies.keys()) {
      const targetWorkspace = workspaceByName.get(dependencyName);

      if (!targetWorkspace) {
        continue;
      }

      const violation = validateWorkspaceDependency({
        fromWorkspace: workspace,
        repoRoot,
        targetWorkspace,
      });

      if (violation) {
        violations.push(violation);
      }
    }
  }

  return violations;
}

async function checkWorkspaceReferences(workspaces, repoRoot) {
  const violations = [];
  const workspaceByName = new Map(workspaces.map((workspace) => [workspace.name, workspace]));

  for (const workspace of workspaces) {
    const files = await collectWorkspaceFiles(workspace.rootPath);

    for (const filePath of files) {
      const sourceText = await readFile(filePath, 'utf8');
      const specifiers = codeFileExtensions.has(filePath.slice(filePath.lastIndexOf('.')))
        ? extractImportSpecifiers(sourceText)
        : getTsconfigExtendsSpecifiers(JSON.parse(sourceText));

      for (const specifier of specifiers) {
        if (specifier.startsWith('.')) {
          const resolvedTarget = resolve(dirname(filePath), specifier);

          if (isInsidePath(resolvedTarget, workspace.rootPath)) {
            continue;
          }

          const targetWorkspace = findWorkspaceForPath(workspaces, resolvedTarget);
          const targetDescription = targetWorkspace
            ? targetWorkspace.name
            : normalizeForDisplay(resolvedTarget, repoRoot);

          violations.push(
            `${normalizeForDisplay(filePath, repoRoot)}: relative import ${specifier} escapes ${workspace.name} and reaches ${targetDescription}. Use a declared workspace package import instead.`,
          );
          continue;
        }

        const targetWorkspaceName = getWorkspaceNameFromSpecifier(specifier);

        if (!targetWorkspaceName) {
          continue;
        }

        const targetWorkspace = workspaceByName.get(targetWorkspaceName);

        if (!targetWorkspace) {
          violations.push(
            `${normalizeForDisplay(filePath, repoRoot)}: ${specifier} points to an unknown workspace package.`,
          );
          continue;
        }

        const violation = validateWorkspaceSpecifier({
          fromWorkspace: workspace,
          repoRoot,
          sourceFilePath: filePath,
          specifier,
          targetWorkspace,
        });

        if (violation) {
          violations.push(violation);
        }
      }
    }
  }

  return violations;
}

export async function checkWorkspaceBoundaries(repoRoot = defaultRepoRoot) {
  const workspaces = await discoverWorkspaces(repoRoot);
  const packageViolations = await checkPackageJsonDependencies(workspaces, repoRoot);
  const referenceViolations = await checkWorkspaceReferences(workspaces, repoRoot);

  return [...packageViolations, ...referenceViolations];
}

async function main() {
  const violations = await checkWorkspaceBoundaries();

  if (violations.length === 0) {
    console.log('Workspace boundary check passed.');
    return;
  }

  console.error('Workspace boundary check failed:');

  for (const violation of violations) {
    console.error(`- ${violation}`);
  }

  process.exitCode = 1;
}

if (process.argv[1] === scriptFilePath) {
  await main();
}