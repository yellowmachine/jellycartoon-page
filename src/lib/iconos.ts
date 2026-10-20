// Los iconos de las tarjetas: los de Lucide (https://lucide.dev/icons), que docs/web.md elige por
// nombre. Se meten en el HTML tal cual, así que no hace falta servir ningún fichero.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const cache = new Map<string, Promise<string | null>>();

/** El SVG del icono, listo para meter en la página, o null si Lucide no tiene ese nombre. */
export function cargarIcono(nombre: string): Promise<string | null> {
	if (!cache.has(nombre)) cache.set(nombre, leerIcono(nombre));
	return cache.get(nombre)!;
}

async function leerIcono(nombre: string): Promise<string | null> {
	let svg: string;
	try {
		svg = await readFile(require.resolve(`lucide-static/icons/${nombre}.svg`), 'utf8');
	} catch {
		return null;
	}
	return svg
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/class="[^"]*"/, 'class="tarjeta__icono" aria-hidden="true" focusable="false"')
		.trim();
}
