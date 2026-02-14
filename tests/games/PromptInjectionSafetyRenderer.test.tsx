import PromptInjectionSafetyRenderer from '../../components/PromptInjectionSafetyRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';

createGameTestSuite('PromptInjectionSafetyRenderer', PromptInjectionSafetyRenderer, { tier: 'all' });
