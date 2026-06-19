import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite-plus';

export default defineConfig({
	server: {
		port: 3001,
	},
	preview: {
		allowedHosts: true,
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});
