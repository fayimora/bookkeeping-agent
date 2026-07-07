import { defineConfig } from 'vite-plus';

export default defineConfig({
	fmt: {
		ignorePatterns: [
			'.entire/**',
			'.pi/**',
			'**/node_modules/**',
			'apps/web/.tanstack/**',
			'apps/web/.vinxi/**',
			'apps/web/dist/**',
			'apps/web/src/routeTree.gen.ts',
			'node_modules/**',
			'packages/db/dist/**',
		],
		semi: true,
		singleQuote: true,
		sortPackageJson: true,
	},
	lint: {
		ignorePatterns: [
			'.entire/**',
			'.pi/**',
			'**/node_modules/**',
			'apps/web/.tanstack/**',
			'apps/web/.vinxi/**',
			'apps/web/dist/**',
			'apps/web/src/routeTree.gen.ts',
			'node_modules/**',
			'packages/db/dist/**',
		],
		options: {
			typeAware: false,
			typeCheck: false,
		},
	},
	staged: {
		'*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}': 'vp check --fix',
	},
});
