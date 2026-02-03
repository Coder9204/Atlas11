/**
 * TDD Test Suite for CenterOfMassRenderer
 *
 * This file demonstrates how to use the universal game test factory.
 * Simply import your game component and call createGameTestSuite()
 * to run ALL 108 validation tests against it.
 *
 * To test a different game, just copy this file and change the import.
 */

import CenterOfMassRenderer from '../../components/CenterOfMassRenderer';
import { createGameTestSuite } from '../utils/game-test-factory';

// Run the complete TDD validation suite against CenterOfMassRenderer
createGameTestSuite('CenterOfMassRenderer', CenterOfMassRenderer);
