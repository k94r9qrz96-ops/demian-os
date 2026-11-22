import {Composition, Still} from 'remotion';
import {AlpinasObligado, Portada, FPS} from './AlpinasObligado';
import {Test} from './Test';
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="AlpinasObligado" component={AlpinasObligado} durationInFrames={30 * FPS} fps={FPS} width={1080} height={1920} />
    <Still id="Portada" component={Portada} width={1080} height={1920} />
    <Composition id="EngineTest" component={Test} durationInFrames={60} fps={30} width={1080} height={1920} />
  </>
);
