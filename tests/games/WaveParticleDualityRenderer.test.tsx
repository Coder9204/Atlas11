import WaveParticleDualityRenderer from '../../components/WaveParticleDualityRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';

createGameTestSuite('WaveParticleDualityRenderer', WaveParticleDualityRenderer, {
  tier: 'all',
  architecture: 'self-managing',
});
