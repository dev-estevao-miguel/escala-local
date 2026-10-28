import { sveltekit } from '@sveltejs/kit/vite';
import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Na Vercel (variável VERCEL definida no build) usa o adaptador dela; nos demais casos, servidor Node.
const adapter = process.env.VERCEL ? adapterVercel({ runtime: 'nodejs24.x' }) : adapterNode();

export default defineConfig(({ command }) => ({
	build: { sourcemap: false },
	server: { watch: { ignored: ['**/build/**', '**/.codex-backup/**', '**/test-results/**', '**/redesign/**'] } },
	plugins: [tailwindcss(), sveltekit({
		adapter,
		csrf: { trustedOrigins: [] },
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:'],
				'connect-src': command === 'serve' ? ['self', 'ws://127.0.0.1:*', 'ws://localhost:*'] : ['self'],
				'worker-src': ['self'],
				'manifest-src': ['self'],
				'base-uri': ['none'],
				'object-src': ['none'],
				'frame-ancestors': ['none'],
				'form-action': ['self']
			}
		}
	})]
}));
