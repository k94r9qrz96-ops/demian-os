import {Composition, Folder, Still} from 'remotion';
import {SmokeTest} from './SmokeTest';
import {Reel, calculateReelMetadata} from './reel/Reel';
import {ReelPro, calculateReelProMetadata} from './pro/ReelPro';
import {Portada} from './pro/Portada';
import {PortadaComparador} from './pro/PortadaComparador';
import {PortadaPoster} from './pro/PortadaPoster';

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
    <Folder name="Premium">
      <Composition
        id="ReelPro"
        component={ReelPro}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={calculateReelProMetadata}
        defaultProps={{
          brand: {slug: 'ejemplo', nombre: 'Ejemplo', handle: '@ejemplo', colores: {fondo: '#07070D', primario: '#6D4AFF', acento: '#19E6B4', texto: '#FFFFFF'}, tipografia: {titulos: 'fonts/Poppins-Bold.ttf'}, logo: null},
          timeline: {duracion: 3, escenas: [], eventos: {}, subtitulos: []},
          audio: null,
          marcaDeAgua: 'VISTA PREVIA',
        }}
      />
    </Folder>
    <Folder name="Portadas">
      <Still
        id="Portada"
        component={Portada}
        width={1080}
        height={1920}
        defaultProps={{
          brand: {slug: 'ejemplo', nombre: 'Ejemplo', handle: '@ejemplo', colores: {fondo: '#050505', primario: '#7BC800', acento: '#B4F000', texto: '#FFFFFF'}, tipografia: {titulos: 'fonts/Poppins-Bold.ttf'}, logo: null},
          linea1: '¿Tu Instagram', resalte: 'VENDE', linea2: 'o solo', tachado: 'publica?',
          antes: 'fonts/none.jpg', despues: 'fonts/none.jpg', tituloPieza: 'Ejemplo', negocioEjemplo: 'cuenta.ejemplo', cta: 'Mirá el cambio ▶',
        }}
      />
      <Still
        id="PortadaComparador"
        component={PortadaComparador}
        width={1080}
        height={1920}
        defaultProps={{
          brand: {slug: 'ejemplo', nombre: 'Ejemplo', handle: '@ejemplo', colores: {fondo: '#050505', primario: '#7BC800', acento: '#B4F000', texto: '#FFFFFF'}, tipografia: {titulos: 'fonts/Poppins-Bold.ttf'}, logo: null},
          foto: 'fonts/none.jpg', kicker: 'Misma foto.', titulo: 'OTRO NIVEL.', pregunta1: '¿Cuál elegiría', pregunta2: 'tu cliente?', boton: 'Mirá cómo lo hacemos ▶',
        }}
      />
      <Still
        id="PortadaPoster"
        component={PortadaPoster}
        width={1080}
        height={1920}
        defaultProps={{
          brand: {slug: 'ejemplo', nombre: 'Ejemplo', handle: '@ejemplo', colores: {fondo: '#050505', primario: '#7BC800', acento: '#B4F000', texto: '#FFFFFF'}, tipografia: {titulos: 'fonts/Poppins-Bold.ttf'}, logo: null},
          estilo: 'tipografica' as const, lineas: [{t: 'DEJÁ DE', s: 'serif' as const}, {t: 'VENDER.', s: 'resalte' as const}],
        }}
      />
    </Folder>
    <Folder name="Sistema">
      <Composition id="SmokeTest" component={SmokeTest} durationInFrames={60} fps={30} width={1080} height={1920} defaultProps={{title: 'RUSHY AI'}} />
    </Folder>
  </>
);
