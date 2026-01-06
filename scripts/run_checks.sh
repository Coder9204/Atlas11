set -euo pipefail

echo "Running TypeScript checks..."

# Run from repo root (where package.json lives).
# This script should FAIL (non-zero exit) if any check fails.

# Install deps if needed
if [ ! -d "node_modules" ]; then
  npm ci
fi

# Typecheck only (fast, catches real errors)
npx tsc --noEmit

echo "Checks passed ✅"
