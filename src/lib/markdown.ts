// Markdown → HTML, para los párrafos de docs/web.md y las notas de las releases.
import type { Root as Mdast, RootContent } from 'mdast';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const lector = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm);
const escritor = unified().use(remarkRehype).use(rehypeSanitize).use(rehypeStringify);

export function parsear(texto: string): Mdast {
	return lector.parse(texto);
}

/**
 * Convierte nodos de Markdown en HTML. `minimoTitulo` baja los títulos para que no compitan con
 * los de la página: con 3, un «#» de las notas sale como <h3>.
 */
export async function aHtml(nodos: RootContent[], minimoTitulo = 1): Promise<string> {
	const raiz: Mdast = { type: 'root', children: structuredClone(nodos) };
	bajarTitulos(raiz, minimoTitulo - 1);
	return escritor.stringify(await escritor.run(raiz));
}

export async function markdownAHtml(texto: string, minimoTitulo = 1): Promise<string> {
	return aHtml(parsear(texto).children, minimoTitulo);
}

function bajarTitulos(nodo: Mdast | RootContent, niveles: number) {
	if (niveles <= 0) return;
	if (nodo.type === 'heading') {
		nodo.depth = Math.min(6, nodo.depth + niveles) as typeof nodo.depth;
	}
	if ('children' in nodo) for (const hijo of nodo.children) bajarTitulos(hijo, niveles);
}
