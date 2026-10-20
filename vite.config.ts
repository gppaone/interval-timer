import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter()
    })
  ],
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib')
    }
  }
});