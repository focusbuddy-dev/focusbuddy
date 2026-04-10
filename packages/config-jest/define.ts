import type { Config } from '@jest/types';

export type JestConfig = Config.InitialOptions;
export type EsmPackageSupportOptions = {
	packageNames?: readonly string[];
	extensionsToTreatAsEsm?: readonly string[];
	extraTransformIgnorePatterns?: readonly string[];
};

const defaultNodeModulesTransformIgnorePattern = '/node_modules/';

export const defineJestConfig = <T extends JestConfig>(config: T): T => config;

function mergeUniqueStrings(...lists: ReadonlyArray<readonly string[] | undefined>): string[] {
	const merged: string[] = [];

	for (const list of lists) {
		for (const value of list ?? []) {
			if (!merged.includes(value)) {
				merged.push(value);
			}
		}
	}

	return merged;
}

function escapeRegExp(value: string): string {
	return value.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function isNodeModulesTransformIgnorePattern(pattern: string): boolean {
	return pattern.includes('/node_modules/');
}

function createNodeModulesTransformIgnorePattern(packageNames: readonly string[]): string {
	if (packageNames.length === 0) {
		return defaultNodeModulesTransformIgnorePattern;
	}

	const alternation = packageNames.map(escapeRegExp).join('|');

	return `/node_modules/(?!(?:${alternation})(?:/|$))/`;
}

export const withEsmPackageSupport = <T extends JestConfig>(
	config: T,
	options: EsmPackageSupportOptions = {},
): T & JestConfig => {
	const extensionsToTreatAsEsm = mergeUniqueStrings(
		config.extensionsToTreatAsEsm,
		options.extensionsToTreatAsEsm,
	);
	const transformIgnorePatterns = [
		createNodeModulesTransformIgnorePattern(options.packageNames ?? []),
		...mergeUniqueStrings(
			(config.transformIgnorePatterns ?? []).filter(
				(pattern): pattern is string => !isNodeModulesTransformIgnorePattern(pattern),
			),
			options.extraTransformIgnorePatterns,
		),
	];

	return defineJestConfig({
		...config,
		...(extensionsToTreatAsEsm.length > 0 ? { extensionsToTreatAsEsm } : {}),
		transformIgnorePatterns,
	});
};
