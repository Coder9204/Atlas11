#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# SMART 2-PASS ACCOUNTING & FINANCE GAME ENHANCEMENT SCRIPT
# =============================================================================
# Pass 1: Quick pass with 30-minute timeout. If phase fails, defer it + remaining phases
# Pass 2: Break deferred phases into subphases (1 concept each) for easier completion
# =============================================================================

TARGET_FILE="components/GeneratedDiagram.tsx"
DONE_FILE="work/done_af_phases.txt"
LOG_DIR="work/logs_af"
DEFERRED_FILE="work/deferred_phases.txt"

mkdir -p work "$LOG_DIR"
touch "$DONE_FILE"
> "$DEFERRED_FILE"  # Clear deferred file

export GIT_EDITOR=true

# ---- All Accounting & Finance Games ----
GAMES=(
  "AccountingEquationRenderer"
  "DoubleEntryBookkeepingRenderer"
  "GeneralLedgerRenderer"
  "BalanceSheetRenderer"
  "CashFlowStatementRenderer"
  "AccrualCashBasisRenderer"
  "DepreciationMethodsRenderer"
  "AmortizationRenderer"
  "InventoryValuationRenderer"
  "ManagerialAccountingRenderer"
  "CloudAccountingRenderer"
  "CryptoAccountingRenderer"
  "ForensicAccountingRenderer"
  "FinancialStatementsRenderer"
  "ProfitMarginRenderer"
  "FinancialRatioAnalysisRenderer"
  "WorkingCapitalManagementRenderer"
  "BreakEvenRenderer"
  "BreakEvenAnalysisRenderer"
  "FinancialModelingRenderer"
  "BudgetForecastRenderer"
  "ZeroBasedBudgetRenderer"
  "BudgetingRenderer"
  "RevenueModelsRenderer"
  "CashFlowRenderer"
  "ProfitLossRenderer"
  "UnitEconomicsRenderer"
  "AuditPrepRenderer"
  "AuditTrailsRenderer"
  "FinancialStatementAuditingRenderer"
  "TaxStructuresRenderer"
  "SalesTaxNexusRenderer"
  "TaxCreditsRenderer"
  "EquityOwnershipRenderer"
  "EquityDebtFinancingRenderer"
  "AngelInvestorsRenderer"
  "VentureCapitalRenderer"
  "FundraisingRenderer"
  "PayrollProcessingRenderer"
)

PHASES=(1 2a1 2a2 2a3 2b1 2b2 2b3 3)

# ---- Configuration ----
PASS1_TIMEOUT=30      # 30 minutes for Pass 1
PASS2_TIMEOUT=20      # 20 minutes for subphases in Pass 2
MAX_TURNS=250

run_with_timeout() {
  local timeout_mins="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "${timeout_mins}m" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "${timeout_mins}m" "$@"
  else
    perl -e 'alarm shift; exec @ARGV' "$((timeout_mins * 60))" "$@"
  fi
}

DRIVER_SYS="$(cat prompts/driver_system.txt)"

CLAUDE_FLAGS=(
  -p
  --append-system-prompt "$DRIVER_SYS"
  --permission-mode acceptEdits
  --tools "Read,Edit,Grep,Glob,LS,Bash"
  --max-turns "$MAX_TURNS"
  --fallback-model sonnet
)

# ---- Helper functions ----
is_phase_done() {
  local game="$1"
  local phase="$2"
  grep -qxF "${game}:${phase}" "$DONE_FILE" 2>/dev/null
}

mark_phase_done() {
  local game="$1"
  local phase="$2"
  echo "${game}:${phase}" >> "$DONE_FILE"
}

get_line_hint() {
  local game="$1"
  case "$game" in
    AccountingEquationRenderer) echo "~39560" ;;
    DoubleEntryBookkeepingRenderer) echo "~40214" ;;
    GeneralLedgerRenderer) echo "~43620" ;;
    BalanceSheetRenderer) echo "~44947" ;;
    CashFlowStatementRenderer) echo "~45718" ;;
    AccrualCashBasisRenderer) echo "~46452" ;;
    DepreciationMethodsRenderer) echo "~46824" ;;
    AmortizationRenderer) echo "~47121" ;;
    InventoryValuationRenderer) echo "~47388" ;;
    ManagerialAccountingRenderer) echo "~54811" ;;
    CloudAccountingRenderer) echo "~54454" ;;
    CryptoAccountingRenderer) echo "~55027" ;;
    ForensicAccountingRenderer) echo "~54667" ;;
    FinancialStatementsRenderer) echo "~62114" ;;
    ProfitMarginRenderer) echo "~48220" ;;
    FinancialRatioAnalysisRenderer) echo "~48672" ;;
    WorkingCapitalManagementRenderer) echo "~49071" ;;
    BreakEvenRenderer) echo "~30327" ;;
    BreakEvenAnalysisRenderer) echo "~51456" ;;
    FinancialModelingRenderer) echo "~54383" ;;
    BudgetForecastRenderer) echo "~49459" ;;
    ZeroBasedBudgetRenderer) echo "~50286" ;;
    BudgetingRenderer) echo "~62578" ;;
    RevenueModelsRenderer) echo "~27271" ;;
    CashFlowRenderer) echo "~29760" ;;
    ProfitLossRenderer) echo "~30043" ;;
    UnitEconomicsRenderer) echo "~27362" ;;
    AuditPrepRenderer) echo "~52318" ;;
    AuditTrailsRenderer) echo "~54596" ;;
    FinancialStatementAuditingRenderer) echo "~54883" ;;
    TaxStructuresRenderer) echo "~52681" ;;
    SalesTaxNexusRenderer) echo "~52980" ;;
    TaxCreditsRenderer) echo "~55099" ;;
    EquityOwnershipRenderer) echo "~30895" ;;
    EquityDebtFinancingRenderer) echo "~54076" ;;
    AngelInvestorsRenderer) echo "~31178" ;;
    VentureCapitalRenderer) echo "~31447" ;;
    FundraisingRenderer) echo "~39174" ;;
    PayrollProcessingRenderer) echo "~53275" ;;
    *) echo "unknown" ;;
  esac
}

get_phase_prompt() {
  local phase="$1"
  case "$phase" in
    1) cat prompts/phase1_research.txt ;;
    2a1) cat prompts/phase2a1_infrastructure.txt ;;
    2a2) cat prompts/phase2a2_concepts1to3.txt ;;
    2a3) cat prompts/phase2a3_concepts4to5.txt ;;
    2b1) cat prompts/phase2b1_concepts6to8.txt ;;
    2b2) cat prompts/phase2b2_concepts9to10.txt ;;
    2b3) cat prompts/phase2b3_polish.txt ;;
    3) cat prompts/phase3_test.txt ;;
    *) echo "Invalid phase: $phase" >&2; exit 1 ;;
  esac
}

# Generate subphase prompt for breaking up difficult phases
get_subphase_prompt() {
  local phase="$1"
  local subphase="$2"

  case "${phase}_${subphase}" in
    2a2_1) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 1 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 1.
Create 1 screen for Concept 1 using the combined pattern (prediction + reveal in same screen).
Screen number: 0
Update comment: "Phase 2a2 Subphase 1: Concept 1 done"
PROMPT
      ;;
    2a2_2) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 2 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 2.
Create 1 screen for Concept 2 using the combined pattern.
Screen number: 1
Update comment: "Phase 2a2 Subphase 2: Concept 2 done"
PROMPT
      ;;
    2a2_3) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 3 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 3.
Create 1 screen for Concept 3 using the combined pattern.
Screen number: 2
Update comment: "Phase 2a2 Complete: All 3 concepts done"
PROMPT
      ;;
    2a3_1) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 4 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 4.
Create 1 screen for Concept 4, continue from previous screen numbers.
Update comment: "Phase 2a3 Subphase 1: Concept 4 done"
PROMPT
      ;;
    2a3_2) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 5 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 5.
Create 1 screen for Concept 5, continue from previous screen numbers.
Update comment: "Phase 2a3 Complete: Concepts 4-5 done"
PROMPT
      ;;
    2b1_1) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 6 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 6.
Create 1 screen for Concept 6, continue from previous screen numbers.
Update comment: "Phase 2b1 Subphase 1: Concept 6 done"
PROMPT
      ;;
    2b1_2) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 7 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 7.
Create 1 screen for Concept 7, continue from previous screen numbers.
Update comment: "Phase 2b1 Subphase 2: Concept 7 done"
PROMPT
      ;;
    2b1_3) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 8 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 8.
Create 1 screen for Concept 8, continue from previous screen numbers.
Update comment: "Phase 2b1 Complete: Concepts 6-8 done"
PROMPT
      ;;
    2b2_1) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 9 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 9.
Create 1 screen for Concept 9, continue from previous screen numbers.
Update comment: "Phase 2b2 Subphase 1: Concept 9 done"
PROMPT
      ;;
    2b2_2) cat <<'PROMPT'
SUBPHASE: Implement ONLY Concept 10 (ONE screen)
Read the ENHANCEMENT PLAN to find Concept 10.
Create 1 screen for Concept 10, continue from previous screen numbers.
Update comment: "Phase 2b2 Subphase 2: Concept 10 done"
PROMPT
      ;;
    2b2_3) cat <<'PROMPT'
SUBPHASE: Implement ONLY Scenario 1 (ONE screen)
Create 1 scenario challenge screen combining multiple concepts.
Use emerald gradient background for scenario screens.
Update comment: "Phase 2b2 Subphase 3: Scenario 1 done"
PROMPT
      ;;
    2b2_4) cat <<'PROMPT'
SUBPHASE: Implement ONLY Scenario 2 (ONE screen)
Create 1 scenario challenge screen combining multiple concepts.
Update comment: "Phase 2b2 Complete: All concepts and scenarios done"
PROMPT
      ;;
    *) echo "Unknown subphase" ;;
  esac
}

get_subphase_count() {
  local phase="$1"
  case "$phase" in
    2a2) echo 3 ;;  # 3 concepts
    2a3) echo 2 ;;  # 2 concepts
    2b1) echo 3 ;;  # 3 concepts
    2b2) echo 4 ;;  # 2 concepts + 2 scenarios
    *) echo 1 ;;    # Other phases don't need subphases
  esac
}

build_prompt() {
  local game="$1"
  local phase="$2"
  local subphase="${3:-}"
  local phase_prompt
  local line_hint

  line_hint="$(get_line_hint "$game")"

  if [ -n "$subphase" ]; then
    phase_prompt="$(get_subphase_prompt "$phase" "$subphase")"
    cat <<EOF
TARGET FILE: $TARGET_FILE
GAME: $game (line $line_hint)
PHASE: $phase SUBPHASE: $subphase

TASK: Implement ONE concept/screen only.
1) Read $TARGET_FILE at line $line_hint
2) Apply subphase instructions below
3) Run: bash scripts/run_checks.sh
4) Output: DONE $game PHASE ${phase}_${subphase}

=== SUBPHASE INSTRUCTIONS ===
$phase_prompt
=== END INSTRUCTIONS ===

Output exactly "DONE $game PHASE ${phase}_${subphase}" on success.
EOF
  else
    phase_prompt="$(get_phase_prompt "$phase")"
    cat <<EOF
TARGET FILE: $TARGET_FILE
GAME TO PROCESS: $game
PHASE: $phase of 8

IMPORTANT: The renderer function is located at approximately line $line_hint.

TASK:
1) Read $TARGET_FILE at line $line_hint to find the $game function
2) Apply Phase $phase instructions below
3) Run: bash scripts/run_checks.sh
4) Output: DONE $game PHASE $phase

=== PHASE $phase INSTRUCTIONS ===
$phase_prompt
=== END PHASE $phase INSTRUCTIONS ===

Output exactly "DONE $game PHASE $phase" on success, or "FAIL $game PHASE $phase" on failure.
EOF
  fi
}

# Process a single phase/subphase
process_phase() {
  local game="$1"
  local phase="$2"
  local subphase="${3:-}"
  local timeout_mins="$4"

  local phase_id="${phase}"
  [ -n "$subphase" ] && phase_id="${phase}_${subphase}"

  if is_phase_done "$game" "$phase_id"; then
    echo "[$game] Phase $phase_id already done, skipping..."
    return 0
  fi

  echo ""
  echo "============================================================"
  echo "PROCESSING: $game - Phase $phase_id (${timeout_mins}m timeout)"
  echo "============================================================"

  local prompt
  prompt="$(build_prompt "$game" "$phase" "$subphase")"

  local stamp bak out_log
  stamp="$(date +%Y%m%d_%H%M%S)"
  bak="work/backup_${game}_${phase_id}_${stamp}.bak"
  out_log="${LOG_DIR}/${game}_phase${phase_id}_${stamp}.txt"

  cp "$TARGET_FILE" "$bak"

  set +e
  run_with_timeout "$timeout_mins" claude "${CLAUDE_FLAGS[@]}" "$prompt" >"$out_log" 2>&1
  local rc=$?
  set -e

  if [ "$rc" -ne 0 ]; then
    echo "TIMEOUT/FAIL (rc=$rc). Restoring..."
    cp "$bak" "$TARGET_FILE"
    rm -f "$bak"
    return 1
  fi

  local done_pattern="DONE ${game} PHASE ${phase_id}"

  if ! grep -qF "$done_pattern" "$out_log"; then
    echo "No DONE line found. Restoring..."
    cp "$bak" "$TARGET_FILE"
    rm -f "$bak"
    return 1
  fi

  if ! bash scripts/run_checks.sh; then
    echo "TypeScript checks failed. Restoring..."
    cp "$bak" "$TARGET_FILE"
    rm -f "$bak"
    return 1
  fi

  # Success!
  if ! git diff --quiet -- "$TARGET_FILE"; then
    git add "$TARGET_FILE"
    git commit -m "feat(${game}): complete phase ${phase_id}" >/dev/null
  fi

  mark_phase_done "$game" "$phase_id"
  rm -f "$bak"
  echo "SUCCESS: $game Phase $phase_id"
  return 0
}

# ---- Main execution ----
RUN_ID="$(date +%Y%m%d_%H%M%S)"
echo "Run ID: $RUN_ID"
echo "Total games: ${#GAMES[@]}"

# ============================================================================
# PASS 1: Quick pass with 30-minute timeout
# ============================================================================
echo ""
echo "============================================================"
echo "PASS 1: Quick pass (${PASS1_TIMEOUT}m timeout per phase)"
echo "============================================================"

for game in "${GAMES[@]}"; do
  skip_remaining=false

  for phase in "${PHASES[@]}"; do
    if [ "$skip_remaining" = true ]; then
      # Defer this phase and continue
      echo "Deferring: $game Phase $phase (previous phase failed)"
      echo "${game}:${phase}" >> "$DEFERRED_FILE"
      continue
    fi

    if ! process_phase "$game" "$phase" "" "$PASS1_TIMEOUT"; then
      echo "FAILED: $game Phase $phase - deferring remaining phases"
      echo "${game}:${phase}" >> "$DEFERRED_FILE"
      skip_remaining=true
    fi
  done
done

# ============================================================================
# PASS 2: Process deferred phases with subphases
# ============================================================================
if [ -s "$DEFERRED_FILE" ]; then
  echo ""
  echo "============================================================"
  echo "PASS 2: Processing deferred phases (broken into subphases)"
  echo "============================================================"

  # Sort and dedupe deferred file
  sort -u "$DEFERRED_FILE" -o "$DEFERRED_FILE"

  while IFS=: read -r game phase; do
    [ -z "$game" ] && continue
    [ -z "$phase" ] && continue

    # Skip if already done
    if is_phase_done "$game" "$phase"; then
      echo "[$game] Phase $phase already done, skipping..."
      continue
    fi

    subphase_count=$(get_subphase_count "$phase")

    if [ "$subphase_count" -gt 1 ]; then
      echo ""
      echo "Breaking $game Phase $phase into $subphase_count subphases..."

      all_subphases_done=true
      for ((i=1; i<=subphase_count; i++)); do
        if ! process_phase "$game" "$phase" "$i" "$PASS2_TIMEOUT"; then
          echo "Subphase $i failed for $game Phase $phase"
          all_subphases_done=false
          # Try once more with longer timeout
          if ! process_phase "$game" "$phase" "$i" "$((PASS2_TIMEOUT + 10))"; then
            echo "Subphase $i still failed, skipping..."
            break
          fi
        fi
      done

      # If all subphases done, mark the main phase as done
      if [ "$all_subphases_done" = true ]; then
        mark_phase_done "$game" "$phase"
        echo "All subphases complete for $game Phase $phase"
      fi
    else
      # Non-breakable phase, try with longer timeout
      if ! process_phase "$game" "$phase" "" "$((PASS1_TIMEOUT + 15))"; then
        echo "Phase $phase still failed for $game"
      fi
    fi
  done < "$DEFERRED_FILE"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "============================================================"
echo "SUMMARY"
echo "============================================================"

completed=$(wc -l < "$DONE_FILE" | tr -d ' ')
echo "Phases completed: $completed"
echo "Done file: $DONE_FILE"
echo "Deferred file: $DEFERRED_FILE"
echo "Logs: $LOG_DIR"

# Count fully complete games
full_count=0
for game in "${GAMES[@]}"; do
  all_done=true
  for phase in "${PHASES[@]}"; do
    if ! is_phase_done "$game" "$phase"; then
      all_done=false
      break
    fi
  done
  [ "$all_done" = true ] && full_count=$((full_count + 1))
done
echo "Games fully complete: $full_count / ${#GAMES[@]}"
echo "============================================================"
