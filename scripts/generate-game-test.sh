#!/bin/bash

# ============================================================================
# GAME TEST GENERATOR v2
# ============================================================================
# Usage: ./scripts/generate-game-test.sh GameRendererName [architecture]
#
# Creates a test file using the universal TDD test factory v2 with
# architecture auto-detection and tiered validation.
#
# Arguments:
#   GameRendererName  - Name of the renderer component (without .tsx)
#   architecture      - Optional: 'self-managing' or 'externally-managed' or 'auto'
#
# Example:
#   ./scripts/generate-game-test.sh WaveParticleDualityRenderer
#   ./scripts/generate-game-test.sh BrachistochroneRenderer externally-managed
# ============================================================================

if [ -z "$1" ]; then
  echo "Usage: $0 <GameRendererName> [architecture]"
  echo "Example: $0 WaveParticleDualityRenderer"
  exit 1
fi

GAME_NAME=$1
ARCH=${2:-auto}
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

# Auto-detect architecture if not specified
if [ "$ARCH" = "auto" ]; then
  if grep -q "gamePhase" "$COMPONENT_FILE"; then
    ARCH="self-managing"
  else
    ARCH="externally-managed"
  fi
fi

# Create the test file
cat > "$TEST_FILE" << EOF
import ${GAME_NAME} from '../../components/${GAME_NAME}';
import { createGameTestSuite } from '../utils/game-test-factory';

createGameTestSuite('${GAME_NAME}', ${GAME_NAME}, {
  tier: 'all',
  architecture: '${ARCH}',
});
EOF

echo "Created: $TEST_FILE (architecture: $ARCH)"
