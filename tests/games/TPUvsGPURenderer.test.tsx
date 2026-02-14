import TPUvsGPURenderer from '../../components/TPUvsGPURenderer';
import { createGameTestSuite } from '../utils/game-test-factory';

createGameTestSuite('TPUvsGPURenderer', TPUvsGPURenderer, { tier: 'all' });
