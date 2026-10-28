import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const runbook = fileURLToPath(new URL('./src/lib/layouts/runbook.svelte', import.meta.url));

// The export ships src/ only; this is the smallest frame that renders it as the desk sees it.
export default defineConfig({
  plugins: [
    sveltekit({
      extensions: ['.svelte', '.svx'],
      preprocess: [
        vitePreprocess(),
        mdsvex({ extensions: ['.svx'], layout: { runbook } }),
      ],
      adapter: adapter(),
      prerender: { entries: ['*'] },
    }),
  ],
});
