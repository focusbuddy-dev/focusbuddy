import { readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptsDir, '..')
const srcDir = resolve(packageDir, 'src')
const outDir = resolve(packageDir, 'dist/cjs')

async function collectTypeScriptEntries(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectTypeScriptEntries(entryPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(entryPath)
    }
  }

  return files
}

const entryPoints = await collectTypeScriptEntries(srcDir)

if (entryPoints.length === 0) {
  throw new Error('No TypeScript source files found for the CommonJS build.')
}

await build({
  entryPoints,
  format: 'cjs',
  outbase: srcDir,
  outdir: outDir,
  packages: 'external',
  platform: 'neutral',
  sourcemap: true,
  target: 'es2022',
})