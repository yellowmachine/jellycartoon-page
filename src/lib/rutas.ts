// Enlaces internos con la base de la web (/jellycartoon-page/ en GitHub Pages, / en un dominio propio).
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

export function ruta(destino = ''): string {
	return base + destino.replace(/^\//, '');
}

const formatoFecha = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: 'Europe/Madrid' });

export function fecha(cuando: Date): string {
	return formatoFecha.format(cuando);
}
