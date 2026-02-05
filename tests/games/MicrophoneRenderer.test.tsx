import MicrophoneRenderer from '../../components/MicrophoneRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';

createGameTestSuite('MicrophoneRenderer', MicrophoneRenderer, {
  tier: 'all',
  architecture: 'self-managing',
});
