// Publica junto a la web las capturas que nombra docs/web.md y que existen.
import type { APIRoute, GetStaticPaths } from 'astro';
import { cargarCaptura } from '../../lib/capturas';
import { cargarWeb } from '../../lib/web';

export const getStaticPaths = (async () => {
	const { funciones } = await cargarWeb();
	const capturas = await Promise.all(
		funciones.filter((f) => f.captura).map((f) => cargarCaptura(f.captura!)),
	);
	return capturas
		.filter((c) => c !== null)
		.map((captura) => ({ params: { fichero: captura.fichero }, props: { captura } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
	const { captura } = props as { captura: NonNullable<Awaited<ReturnType<typeof cargarCaptura>>> };
	return new Response(captura.datos as BodyInit, { headers: { 'Content-Type': captura.tipo } });
};
