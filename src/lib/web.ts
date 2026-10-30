// Los textos de la web: docs/web.md del repo de JellyCartoon. Frontmatter YAML con los datos del
// producto y, después, una sección «## Título» por función, que empieza por un párrafo de campos
// («resumen: …» y, si los tiene, «captura: fichero.png», «icono: nombre-de-lucide» y «grupo: …») y
// sigue con uno o varios párrafos.
import type { Paragraph, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { parse as parsearYaml } from 'yaml';
import { avisar, describirOrigen, leerTexto, releerSiempre } from './fuente';
import { cargarIcono } from './iconos';
import { aHtml, parsear } from './markdown';

const FICHERO = 'docs/web.md';
const OBLIGATORIOS = ['nombre', 'lema', 'descripcion', 'para_quien', 'repositorio', 'instalar'] as const;
const URLS = ['repositorio', 'instalar'] as const;
const CAMPOS_DE_FUNCION = ['resumen', 'captura', 'icono', 'grupo'] as const;
const NOMBRE_DE_CAPTURA = /^[\w-]+\.(png|jpe?g|webp)$/i;

export interface Producto {
	nombre: string;
	lema: string;
	descripcion: string;
	para_quien: string;
	repositorio: string;
	instalar: string;
	/** Opcional mientras no esté en main: sin él, la página de instalar enseña solo el enlace. */
	instalar_resumen?: string;
	/** La línea que instala la app desde una terminal («curl … install.sh | sh»). Opcional igual. */
	instalar_comando?: string;
	/** Lo que se queda en casa, y Seilide fuera de ella: las dos columnas bajo las funciones. */
	en_casa?: string;
	nube?: string;
	nube_url?: string;
}

export interface Funcion {
	titulo: string;
	id: string;
	resumen: string;
	captura?: string;
	/** El bloque de la portada en el que va; sin él, en «Y más». */
	grupo?: string;
	/** El SVG del icono de Lucide que nombra la sección. */
	icono?: string;
	html: string;
}

export interface Web {
	producto: Producto;
	funciones: Funcion[];
}

export interface Grupo {
	titulo: string;
	funciones: Funcion[];
}

/** Las funciones por su grupo, en el orden en que aparece cada grupo en docs/web.md. */
export function agrupar(funciones: Funcion[]): Grupo[] {
	const grupos = new Map<string, Funcion[]>();
	for (const funcion of funciones) {
		const titulo = funcion.grupo ?? 'Y más';
		if (!grupos.has(titulo)) grupos.set(titulo, []);
		grupos.get(titulo)!.push(funcion);
	}
	return [...grupos].map(([titulo, funciones]) => ({ titulo, funciones }));
}

let cache: Promise<Web> | undefined;

export function cargarWeb(): Promise<Web> {
	if (releerSiempre) return leerWeb();
	cache ??= leerWeb();
	return cache;
}

function fallo(mensaje: string): never {
	throw new Error(`[jellycartoon] ${FICHERO} (${describirOrigen()}): ${mensaje}`);
}

async function leerWeb(): Promise<Web> {
	const arbol = parsear(await leerTexto(FICHERO));
	let producto: Producto | undefined;
	const secciones: { titulo: string; nodos: RootContent[] }[] = [];

	for (const nodo of arbol.children) {
		if (nodo.type === 'yaml') producto = leerProducto(nodo.value);
		else if (nodo.type === 'heading' && nodo.depth === 2) secciones.push({ titulo: toString(nodo), nodos: [] });
		else if (secciones.length) secciones.at(-1)!.nodos.push(nodo);
	}

	if (!producto) fallo('falta el frontmatter YAML al principio.');
	if (!secciones.length) fallo('no hay ninguna sección «## Título».');

	const funciones = await Promise.all(secciones.map(leerFuncion));
	return { producto, funciones };
}

function leerProducto(yaml: string): Producto {
	let datos: unknown;
	try {
		datos = parsearYaml(yaml);
	} catch (error) {
		fallo(`el frontmatter no es YAML válido: ${error}`);
	}
	if (!datos || typeof datos !== 'object') fallo('el frontmatter está vacío.');
	const campos = datos as Record<string, unknown>;
	const faltan = OBLIGATORIOS.filter((c) => typeof campos[c] !== 'string' || !(campos[c] as string).trim());
	if (faltan.length) fallo(`faltan en el frontmatter: ${faltan.join(', ')}.`);
	for (const campo of URLS) {
		if (!URL.canParse(campos[campo] as string)) fallo(`«${campo}» no es una URL: ${campos[campo]}`);
	}
	if (typeof campos.instalar_resumen !== 'string') {
		avisar(`${FICHERO} no tiene «instalar_resumen»; la página de instalar sale sin resumen.`);
	}
	const comando = campos.instalar_comando;
	if (comando === undefined) {
		avisar(`${FICHERO} no tiene «instalar_comando»; la página de instalar sale sin la línea para la terminal.`);
	} else if (typeof comando !== 'string' || !comando.trim() || comando.trim().includes('\n')) {
		fallo('«instalar_comando» tiene que ser una sola línea de texto.');
	} else {
		campos.instalar_comando = comando.trim();
	}
	if (campos.nube_url !== undefined && (typeof campos.nube_url !== 'string' || !URL.canParse(campos.nube_url))) {
		fallo(`«nube_url» no es una URL: ${campos.nube_url}`);
	}
	return campos as unknown as Producto;
}

async function leerFuncion({ titulo, nodos }: { titulo: string; nodos: RootContent[] }): Promise<Funcion> {
	const [primero, ...resto] = nodos;
	const campos = primero?.type === 'paragraph' ? leerCampos(primero, titulo) : undefined;
	if (!campos?.resumen) fallo(`la sección «${titulo}» no empieza por una línea «resumen: …».`);
	if (campos.captura && !NOMBRE_DE_CAPTURA.test(campos.captura)) {
		fallo(`la captura de «${titulo}» no es un nombre de imagen válido: ${campos.captura}`);
	}
	const icono = campos.icono ? await cargarIcono(campos.icono) : undefined;
	if (icono === null) {
		fallo(`el icono de «${titulo}» no existe en Lucide: ${campos.icono} (los nombres, en https://lucide.dev/icons).`);
	}
	return {
		titulo,
		id: aId(titulo),
		resumen: campos.resumen,
		captura: campos.captura,
		grupo: campos.grupo,
		icono,
		html: await aHtml(resto, 3),
	};
}

/** El párrafo de campos: cada línea, «clave: valor». Si alguna no lo es, no es un párrafo de campos. */
function leerCampos(parrafo: Paragraph, titulo: string): Partial<Record<(typeof CAMPOS_DE_FUNCION)[number], string>> | undefined {
	const campos: Record<string, string> = {};
	for (const linea of toString(parrafo).split('\n')) {
		const separador = linea.indexOf(':');
		if (separador < 0) return undefined;
		const clave = linea.slice(0, separador).trim();
		if (!CAMPOS_DE_FUNCION.includes(clave as never)) {
			fallo(`campo desconocido «${clave}» en la sección «${titulo}» (se esperan: ${CAMPOS_DE_FUNCION.join(', ')}).`);
		}
		campos[clave] = linea.slice(separador + 1).trim();
	}
	return campos;
}

function aId(titulo: string): string {
	return titulo
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
