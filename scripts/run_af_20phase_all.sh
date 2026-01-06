#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MASTER 20-PHASE SCRIPT: Process All 27 Remaining Games
# =============================================================================
# 1. First: 16 NOT STARTED games (full 20-phase from scratch)
# 2. Then: 11 PARTIAL games (20-phase leveraging existing work)
# 3. Skip: 12 COMPLETE games (already done, do not touch)
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=============================================================="
echo "MASTER 20-PHASE EDUCATIONAL GAME ENHANCEMENT"
echo "=============================================================="
echo ""
echo "Processing Plan:"
echo "  Phase 1: 16 NOT STARTED games (320 phases)"
echo "  Phase 2: 11 PARTIAL games (220 phases, leveraging existing work)"
echo "  SKIP:    12 COMPLETE games (already done)"
echo ""
echo "Total: 540 phases across 27 games"
echo ""
echo "=============================================================="
echo ""

# Phase 1: Process 16 NOT STARTED games
echo "=============================================================="
echo "PHASE 1: Processing 16 NOT STARTED games"
echo "=============================================================="
"${SCRIPT_DIR}/run_af_20phase.sh"

echo ""
echo "=============================================================="
echo "PHASE 1 COMPLETE: 16 NOT STARTED games processed"
echo "=============================================================="
echo ""

# Phase 2: Process 11 PARTIAL games
echo "=============================================================="
echo "PHASE 2: Processing 11 PARTIAL games (leveraging existing work)"
echo "=============================================================="
"${SCRIPT_DIR}/run_af_20phase_partial.sh"

echo ""
echo "=============================================================="
echo "ALL PROCESSING COMPLETE"
echo "=============================================================="
echo ""
echo "Summary:"
echo "  - 16 NOT STARTED games: Check work/done_20phase.txt"
echo "  - 11 PARTIAL games: Check work/done_20phase_partial.txt"
echo "  - 12 COMPLETE games: Untouched (as requested)"
echo ""
echo "Logs:"
echo "  - work/logs_20phase/"
echo "  - work/logs_20phase_partial/"
