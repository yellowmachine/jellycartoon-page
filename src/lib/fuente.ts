// De dónde sale el contenido de JellyCartoon: la copia local (JELLYCARTOON_DIR, por defecto
// ../jellycartoon) para ver los cambios antes de que lleguen a main, o la rama main en GitHub
// cuando se construye en la Action o la copia local no existe. Se decide una vez por proceso.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const REPO = 'yellowmachine/jellycartoon';
const RAW = `https://raw.githubusercontent.com/${REPO}/main/`;
const TIEMPO_MAXIMO = 20_000;

export const enAction = process.env.GITHUB_ACTIONS === 'true';

export type Origen = { tipo: 'local'; dir: string } | { tipo: 'github' };

function decidirOrigen(): Origen {
	if (enAction) {
		console.log('[jellycartoon] contenido leído de GITHUB (main): construcción en GitHub Actions');
		return { tipo: 'github' };
	}
	const pedida = process.env.JELLYCARTOON_DIR;
	const dir = path.resolve(process.cwd(), pedida || '../jellycartoon');
	if (existsSync(dir)) {
		console.log(`[jellycartoon] contenido leído de LOCAL: ${dir}`);
		return { tipo: 'local', dir };
	}
	if (pedida) {
		console.warn(`[jellycartoon] AVISO: JELLYCARTOON_DIR=${pedida} no existe (${dir})`);
	}
	console.log(`[jellycartoon] contenido leído de GITHUB (main): no existe la copia local ${dir}`);
	return { tipo: 'github' };
}

export const origen = decidirOrigen();

/** En `astro dev` con la copia local se relee en cada petición, para ver los cambios al recargar. */
export const releerSiempre = import.meta.env.DEV && origen.tipo === 'local';

const avisados = new Set<string>();

/** Un aviso en la consola, una sola vez por proceso aunque se relea el contenido. */
export function avisar(mensaje: string) {
	if (avisados.has(mensaje)) return;
	avisados.add(mensaje);
	console.warn(`[jellycartoon] AVISO: ${mensaje}`);
}

export function describirOrigen(): string {
	return origen.tipo === 'local' ? `copia local ${origen.dir}` : 'GitHub, rama main';
}

/** Lee un fichero del repo de JellyCartoon; si falta o no se puede leer, falla con un mensaje claro. */
export async function leerTexto(ruta: string): Promise<string> {
	const datos = await leer(ruta);
	if (!datos) throw new Error(`[jellycartoon] No existe ${ruta} (${describirOrigen()}).`);
	return new TextDecoder().decode(datos);
}

/** Como leerTexto, pero devuelve null si el fichero no existe (las capturas que aún no están). */
export async function leerBinario(ruta: string): Promise<Uint8Array | null> {
	return leer(ruta);
}

async function leer(ruta: string): Promise<Uint8Array | null> {
	if (origen.tipo === 'local') {
		try {
			return new Uint8Array(await readFile(path.join(origen.dir, ruta)));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw new Error(`[jellycartoon] No se pudo leer ${ruta} de ${describirOrigen()}: ${error}`);
		}
	}
	const url = RAW + ruta.split('/').map(encodeURIComponent).join('/');
	let respuesta: Response;
	try {
		respuesta = await fetch(url, { signal: AbortSignal.timeout(TIEMPO_MAXIMO) });
	} catch (error) {
		throw new Error(`[jellycartoon] No se pudo conectar con GitHub para leer ${ruta} (${url}): ${error}`);
	}
	if (respuesta.status === 404) return null;
	if (!respuesta.ok) {
		throw new Error(`[jellycartoon] GitHub respondió ${respuesta.status} al leer ${ruta} (${url}).`);
	}
	return new Uint8Array(await respuesta.arrayBuffer());
}
