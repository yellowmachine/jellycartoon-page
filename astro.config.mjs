// @ts-check
import { defineConfig } from 'astro/config';

// Hoy en GitHub Pages (https://yellowmachine.github.io/jellycartoon-page/). Para un dominio
// propio basta con SITE_URL=https://ese-dominio y BASE_PATH=/ al construir.
export default defineConfig({
	site: process.env.SITE_URL || 'https://yellowmachine.github.io',
	base: process.env.BASE_PATH || '/jellycartoon-page',
	trailingSlash: 'ignore',
});
