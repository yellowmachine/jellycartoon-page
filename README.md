# Web de JellyCartoon

La web del producto [JellyCartoon](https://github.com/yellowmachine/jellycartoon), hecha con Astro.
Es estática y no lleva JavaScript en el navegador. Se publica en
<https://yellowmachine.github.io/jellycartoon-page/>.

## De dónde sale el contenido

Nada se copia a mano: todo se lee del repo de JellyCartoon al construir.

| Qué | Fichero o fuente |
| --- | --- |
| Textos | `docs/web.md`: el frontmatter con los datos del producto y una sección `## …` por función |
| Capturas | `docs/capturas/<fichero>`, con el nombre que da cada sección; si falta una, la tarjeta va sin imagen |
| Icono | `static/icon.svg` |
| Novedades | Las releases, de la API de GitHub, también en desarrollo |

Los ficheros salen de la copia local, en `JELLYCARTOON_DIR` (por defecto `../jellycartoon`), para
ver los cambios antes de que lleguen a main. En GitHub Actions, o si esa carpeta no existe, salen de
la rama main en GitHub. La consola dice de cuál ha leído.

Si `docs/web.md` no se puede leer o le falta algo, la construcción falla con un mensaje claro. En la
Action también falla si no llegan las releases; en local, la web sale sin novedades.

## Desarrollo

Con Node 22.22 o más moderno (`nvm use`):

```sh
npm install
npm run dev                           # http://localhost:4321/jellycartoon-page/
npm run build                         # deja la web en dist/
JELLYCARTOON_DIR=/otra/ruta npm run dev
```

Con `npm run dev`, recargar la página basta para ver los cambios de `docs/web.md` y de las capturas.
Las releases se piden una sola vez por proceso.

## Publicación

`.github/workflows/deploy.yml` construye y publica en cada push a main, todos los días a las 5:00 UTC
y a mano (Actions → «Publicar la web» → Run workflow).

Para un dominio propio, construye con `SITE_URL=https://tu-dominio` y `BASE_PATH=/`. El resultado es
la carpeta `dist/`, que sirve cualquier servidor web.
