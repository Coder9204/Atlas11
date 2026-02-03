#!/bin/bash

# ============================================================================
# GAME TEST GENERATOR
# ============================================================================
# Usage: ./scripts/generate-game-test.sh GameRendererName
#
# This script creates a test file for any game renderer that uses the
# universal TDD test factory to run all 109 validation tests.
#
# Example:
#   ./scripts/generate-game-test.sh WaveParticleDualityRenderer
#   npm run test:run -- tests/games/WaveParticleDualityRenderer.test.tsx
# ============================================================================

if [ -z "$1" ]; then
  echo "Usage: $0 <GameRendererName>"
  echo "Example: $0 WaveParticleDualityRenderer"
  exit 1
fi

GAME_NAME=$1
TEST_FILE="tests/games/${GAME_NAME}.test.tsx"
COMPONENT_FILE="components/${GAME_NAME}.tsx"

# Check if component exists
if [ ! -f "$COMPONENT_FILE" ]; then
  echo "Error: Component file not found: $COMPONENT_FILE"
  exit 1
fi

# Check if test already exists
if [ -f "$TEST_FILE" ]; then
  echo "Test file already exists: $TEST_FILE"
  echo "Run: npm run test:run -- $TEST_FILE"
  exit 0
fi

# Create the test file
cat > "$TEST_FILE" << EOF
/**
 * TDD Test Suite for ${GAME_NAME}
 *
 * Auto-generated test file using the universal game test factory.
 * Runs all 109 validation tests against the game component.
 *
 * Run with: npm run test:run -- ${TEST_FILE}
 */

import ${GAME_NAME} from '../../components/${GAME_NAME}';
import { createGameTestSuite } from '../utils/game-test-factory';

// Run the complete TDD validation suite
createGameTestSuite('${GAME_NAME}', ${GAME_NAME});
EOF

echo "Created test file: $TEST_FILE"
echo ""
echo "Run tests with:"
echo "  npm run test:run -- $TEST_FILE"
echo ""
echo "Or run in watch mode:"
echo "  npm test -- $TEST_FILE"
