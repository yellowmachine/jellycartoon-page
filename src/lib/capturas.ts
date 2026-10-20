// Las capturas que nombra docs/web.md, en docs/capturas/ del repo de JellyCartoon. Si una aún no
// existe, la tarjeta va sin imagen; la web se construye igual.
import { imageSize } from 'image-size';
import { avisar, describirOrigen, leerBinario, releerSiempre } from './fuente';

const CARPETA = 'docs/capturas/';

const TIPOS: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
};

export interface Captura {
	fichero: string;
	datos: Uint8Array;
	tipo: string;
	ancho: number;
	alto: number;
}

const cache = new Map<string, Promise<Captura | null>>();

export function cargarCaptura(fichero: string): Promise<Captura | null> {
	if (releerSiempre) return leerCaptura(fichero);
	if (!cache.has(fichero)) cache.set(fichero, leerCaptura(fichero));
	return cache.get(fichero)!;
}

async function leerCaptura(fichero: string): Promise<Captura | null> {
	const datos = await leerBinario(CARPETA + fichero);
	if (!datos) {
		avisar(`falta ${CARPETA}${fichero}; su tarjeta va sin imagen.`);
		return null;
	}
	let tamano;
	try {
		tamano = imageSize(datos);
	} catch (error) {
		throw new Error(`[jellycartoon] ${CARPETA}${fichero} (${describirOrigen()}) no es una imagen válida: ${error}`);
	}
	const extension = fichero.split('.').pop()!.toLowerCase();
	return { fichero, datos, tipo: TIPOS[extension], ancho: tamano.width, alto: tamano.height };
}
