import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vite-plus';

function parseAllowedHosts(value?: string) {
	return value
		?.split(',')
		.map((host) => host.trim())
		.filter(Boolean);
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const allowedHosts = parseAllowedHosts(env.VITE_ALLOWED_HOSTS);

	return {
		plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
		preview: {
			allowedHosts,
		},
		resolve: {
			tsconfigPaths: true,
		},
		server: {
			allowedHosts,
			port: 3001,
		},
	};
});
