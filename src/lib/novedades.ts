// Las novedades: las releases de JellyCartoon en la API de GitHub, también en desarrollo (no están
// en el repo). Sin token, GitHub deja 60 peticiones por hora: se hace una por proceso.
import { REPO, avisar, enAction } from './fuente';
import { markdownAHtml } from './markdown';

const API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;
const TIEMPO_MAXIMO = 20_000;

export interface Version {
	version: string;
	titulo: string;
	fecha: Date;
	html: string;
	url: string;
	prerelease: boolean;
}

interface ReleaseDeGitHub {
	tag_name: string;
	name: string | null;
	body: string | null;
	html_url: string;
	published_at: string | null;
	draft: boolean;
	prerelease: boolean;
}

let cache: Promise<Version[]> | undefined;

/** Todas las versiones publicadas, de la más nueva a la más vieja. */
export function cargarNovedades(): Promise<Version[]> {
	cache ??= leerNovedades();
	return cache;
}

/** La versión para destacar en la portada: la última que no es prerelease. */
export function ultimaVersion(versiones: Version[]): Version | undefined {
	return versiones.find((v) => !v.prerelease) ?? versiones[0];
}

async function leerNovedades(): Promise<Version[]> {
	try {
		const releases = await pedirReleases();
		console.log(`[jellycartoon] novedades leídas de GITHUB (API): ${releases.length} releases`);
		if (releases.length >= 100) {
			avisar('hay 100 releases o más; solo se muestran las 100 últimas.');
		}
		const versiones = await Promise.all(
			releases
				.filter((r) => !r.draft && r.published_at)
				.map(async (r) => ({
					version: r.tag_name,
					titulo: r.name?.trim() || r.tag_name,
					fecha: new Date(r.published_at!),
					html: await markdownAHtml(r.body ?? '', 3),
					url: r.html_url,
					prerelease: r.prerelease,
				})),
		);
		return versiones.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
	} catch (error) {
		// En la Action no se publica una web sin novedades; en local, se avisa y se sigue.
		if (enAction) throw error;
		console.warn((error as Error).message);
		avisar('la web sale sin novedades.');
		return [];
	}
}

async function pedirReleases(): Promise<ReleaseDeGitHub[]> {
	const cabeceras: Record<string, string> = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2022-11-28',
		'User-Agent': 'jellycartoon-page',
	};
	if (process.env.GITHUB_TOKEN) cabeceras.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

	let respuesta: Response;
	try {
		respuesta = await fetch(API, { headers: cabeceras, signal: AbortSignal.timeout(TIEMPO_MAXIMO) });
	} catch (error) {
		throw new Error(`[jellycartoon] No se pudo conectar con la API de GitHub (${API}): ${error}`);
	}
	if (!respuesta.ok) {
		const quedan = respuesta.headers.get('x-ratelimit-remaining');
		const limite = quedan === '0' ? ' Se ha agotado el límite de peticiones por hora.' : '';
		throw new Error(`[jellycartoon] La API de GitHub respondió ${respuesta.status} al pedir las releases (${API}).${limite}`);
	}
	return respuesta.json();
}
