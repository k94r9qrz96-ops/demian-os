import {Composition, Folder} from 'remotion';
import {SmokeTest} from './SmokeTest';
import {Reel, calculateReelMetadata} from './reel/Reel';

// "Reel" es la plantilla única de la fábrica: render.mjs le pasa la marca y el guion de cada cliente.
// Los valores de abajo son solo una vista previa genérica para Remotion Studio.
export const RemotionRoot = () => (
  <>
    <Folder name="Fabrica">
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateReelMetadata}
        defaultProps={{
          brand: {slug: 'ejemplo', nombre: 'Marca de ejemplo', colores: {fondo: '#0A0A12', primario: '#6D4AFF', acento: '#19E6B4', texto: '#FFFFFF'}, tipografia: {titulos: 'fonts/Poppins-Bold.ttf'}, logo: null, handle: '@ejemplo'},
          transicion: 12,
          marcaDeAgua: 'VISTA PREVIA',
          musica: null,
          subtitulos: [],
          escenas: [
            {tipo: 'hook', duracion: 2.5, kicker: 'Ejemplo', lineas: ['Esto es un', 'gancho visual'], resaltar: 'gancho'},
            {tipo: 'lista', duracion: 3.5, titulo: 'Beneficios', items: ['Uno', 'Dos', 'Tres']},
            {tipo: 'cta', duracion: 3, titulo: 'Llamada\na la acción', boton: 'Escribinos', sub: 'Link en bio'},
          ],
        }}
      />
    </Folder>
    <Folder name="Sistema">
      <Composition id="SmokeTest" component={SmokeTest} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{title: 'RUSHY AI'}} />
    </Folder>
  </>
);
