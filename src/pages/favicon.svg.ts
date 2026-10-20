// El icono de la app, de static/icon.svg del repo de JellyCartoon. Si no está, un círculo ámbar.
import type { APIRoute } from 'astro';
import { avisar, leerBinario } from '../lib/fuente';

const PROVISIONAL = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#f59e0b"/></svg>';

export const GET: APIRoute = async () => {
	let icono: BodyInit | null = (await leerBinario('static/icon.svg')) as BodyInit | null;
	if (!icono) {
		avisar('falta static/icon.svg; la web lleva un icono provisional.');
		icono = PROVISIONAL;
	}
	return new Response(icono, { headers: { 'Content-Type': 'image/svg+xml' } });
};
