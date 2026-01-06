#!/bin/bash
# Force bash explicitly

# =============================================================================
# 20-PHASE EDUCATIONAL GAME ENHANCEMENT SCRIPT
# =============================================================================

TARGET_FILE="components/GeneratedDiagram.tsx"
DONE_FILE="work/done_20phase.txt"
LOG_DIR="work/logs_20phase"
PROMPTS_DIR="prompts/20phase"

mkdir -p work "$LOG_DIR"
touch "$DONE_FILE"

export GIT_EDITOR=true

# ---- 16 NOT STARTED Games ----
GAMES="FinancialModelingRenderer ZeroBasedBudgetRenderer BudgetingRenderer CashFlowRenderer UnitEconomicsRenderer AuditTrailsRenderer FinancialStatementAuditingRenderer TaxStructuresRenderer SalesTaxNexusRenderer TaxCreditsRenderer EquityOwnershipRenderer EquityDebtFinancingRenderer AngelInvestorsRenderer VentureCapitalRenderer FundraisingRenderer PayrollProcessingRenderer"

MAX_TURNS=250

# ---- Get phase name ----
get_phase_name() {
  case "$1" in
    1) echo "Expert Knowledge Extraction" ;;
    2) echo "Concept Deep-Dive" ;;
    3) echo "Learning Architecture" ;;
    4) echo "Concept Sequencing" ;;
    5) echo "Scenario Design" ;;
    6) echo "WHY-Teaching Mechanics" ;;
    7) echo "Game Structure" ;;
    8) echo "Screen Specification" ;;
    9) echo "Visual Design System" ;;
    10) echo "Graphics & Assets" ;;
    11) echo "Interaction Design" ;;
    12) echo "Content Writing" ;;
    13) echo "Core Framework" ;;
    14) echo "Screen Implementation" ;;
    15) echo "Animation & Polish" ;;
    16) echo "Integration & Flow" ;;
    17) echo "Functionality Testing" ;;
    18) echo "Learning Validation" ;;
    19) echo "Usability Validation" ;;
    20) echo "Final Quality Gates" ;;
  esac
}

# ---- Get phase file ----
get_phase_file() {
  case "$1" in
    1) echo "phase01_expert_knowledge.txt" ;;
    2) echo "phase02_concept_deepdive.txt" ;;
    3) echo "phase03_learning_architecture.txt" ;;
    4) echo "phase04_concept_sequencing.txt" ;;
    5) echo "phase05_scenario_design.txt" ;;
    6) echo "phase06_why_teaching_mechanics.txt" ;;
    7) echo "phase07_game_structure.txt" ;;
    8) echo "phase08_screen_specification.txt" ;;
    9) echo "phase09_visual_design.txt" ;;
    10) echo "phase10_graphics_assets.txt" ;;
    11) echo "phase11_interaction_design.txt" ;;
    12) echo "phase12_content_writing.txt" ;;
    13) echo "phase13_core_framework.txt" ;;
    14) echo "phase14_screen_implementation.txt" ;;
    15) echo "phase15_animation_polish.txt" ;;
    16) echo "phase16_integration_flow.txt" ;;
    17) echo "phase17_functionality_testing.txt" ;;
    18) echo "phase18_learning_validation.txt" ;;
    19) echo "phase19_usability_validation.txt" ;;
    20) echo "phase20_final_quality.txt" ;;
  esac
}

# ---- Get timeout ----
get_timeout() {
  local phase=$1
  if [ "$phase" -le 8 ]; then
    echo "20"
  elif [ "$phase" -le 16 ]; then
    echo "30"
  else
    echo "15"
  fi
}

# ---- Get line hint ----
get_line_hint() {
  case "$1" in
    FinancialModelingRenderer) echo "27338" ;;
    ZeroBasedBudgetRenderer) echo "28055" ;;
    BudgetingRenderer) echo "28772" ;;
    CashFlowRenderer) echo "29489" ;;
    UnitEconomicsRenderer) echo "30206" ;;
    AuditTrailsRenderer) echo "31640" ;;
    FinancialStatementAuditingRenderer) echo "32357" ;;
    TaxStructuresRenderer) echo "33074" ;;
    SalesTaxNexusRenderer) echo "33791" ;;
    TaxCreditsRenderer) echo "34508" ;;
    EquityOwnershipRenderer) echo "35225" ;;
    EquityDebtFinancingRenderer) echo "35942" ;;
    AngelInvestorsRenderer) echo "36659" ;;
    VentureCapitalRenderer) echo "37376" ;;
    FundraisingRenderer) echo "38093" ;;
    PayrollProcessingRenderer) echo "38810" ;;
    *) echo "1" ;;
  esac
}

# ---- Check if done ----
is_phase_done() {
  grep -q "^${1}:${2}$" "$DONE_FILE" 2>/dev/null
}

# ---- Mark done ----
mark_phase_done() {
  echo "${1}:${2}" >> "$DONE_FILE"
}

# ---- Process phase ----
process_phase() {
  local game="$1"
  local phase="$2"
  local timeout_min=$(get_timeout "$phase")
  local phase_name=$(get_phase_name "$phase")
  local phase_file=$(get_phase_file "$phase")
  local line_hint=$(get_line_hint "$game")
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local log_file="${LOG_DIR}/${game}_phase${phase}_${timestamp}.txt"

  echo ""
  echo "================================================================"
  echo "[$(date '+%H:%M:%S')] Processing: ${game} - Phase ${phase}/20"
  echo "                      ${phase_name}"
  echo "                      Timeout: ${timeout_min} min"
  echo "================================================================"

  local phase_content=$(cat "${PROMPTS_DIR}/${phase_file}")

  local system_prompt="You are running in unattended batch mode.

OVERVIEW: Each game is processed in 20 phases.

PLANNING (1-8): Research, design, specification
BUILDING (9-16): Implementation and construction
TESTING (17-20): Validation and quality assurance

Hard rules:
- Process exactly ONE game, ONE phase at a time
- Only edit components/GeneratedDiagram.tsx
- Only edit code for the specified game
- Phases 1-8: Update ENHANCEMENT PLAN comment block only
- Phases 9-16: Implement actual code changes
- Phases 17-20: Test and validate, fix issues

Verification: Run bash scripts/run_checks.sh

Output contract:
- Success: DONE <GAME_NAME> PHASE <NUMBER>
- Failure: FAIL <GAME_NAME> PHASE <NUMBER>"

  local prompt="TARGET FILE: ${TARGET_FILE}
GAME TO PROCESS: ${game}
PHASE: ${phase} of 20 - ${phase_name}

IMPORTANT: The renderer function is located at approximately line ~${line_hint}.

TASK:
1) Read ${TARGET_FILE} at line ~${line_hint} to find the ${game} function
2) Apply Phase ${phase} instructions below
3) Run: bash scripts/run_checks.sh
4) Output: DONE ${game} PHASE ${phase}

=== PHASE ${phase} INSTRUCTIONS ===
${phase_content}
=== END PHASE ${phase} INSTRUCTIONS ===

Output exactly \"DONE ${game} PHASE ${phase}\" on success, or \"FAIL ${game} PHASE ${phase}\" on failure."

  local output
  if output=$(timeout "${timeout_min}m" claude -p \
    --append-system-prompt "$system_prompt" \
    --permission-mode acceptEdits \
    --tools Read,Edit,Grep,Glob,LS,Bash \
    --max-turns "$MAX_TURNS" \
    --fallback-model sonnet \
    "$prompt" 2>&1); then

    if echo "$output" | grep -q "DONE ${game} PHASE ${phase}"; then
      echo "[$(date '+%H:%M:%S')] SUCCESS: ${game} Phase ${phase}"
      echo "$output" | tail -20 > "$log_file"
      mark_phase_done "$game" "$phase"

      if [ "$phase" -ge 9 ]; then
        git add -A 2>/dev/null || true
        git commit -m "20-phase: ${game} Phase ${phase} - ${phase_name}" 2>/dev/null || true
      fi
      return 0
    else
      echo "[$(date '+%H:%M:%S')] FAIL: ${game} Phase ${phase}"
      echo "$output" | tail -50 > "$log_file"
      return 1
    fi
  else
    local exit_code=$?
    if [ $exit_code -eq 124 ]; then
      echo "[$(date '+%H:%M:%S')] TIMEOUT: ${game} Phase ${phase}"
    else
      echo "[$(date '+%H:%M:%S')] ERROR: ${game} Phase ${phase}"
    fi
    echo "Timeout/Error" > "$log_file"
    return 1
  fi
}

# ---- Main ----
echo "=============================================================="
echo "20-PHASE: 16 NEW GAMES"
echo "=============================================================="

TOTAL_DONE=0
TOTAL_FAIL=0

for game in $GAMES; do
  echo ""
  echo "=============================================================="
  echo "STARTING: ${game}"
  echo "=============================================================="

  for phase in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if is_phase_done "$game" "$phase"; then
      echo "[SKIP] ${game} Phase ${phase} already done"
      continue
    fi

    if process_phase "$game" "$phase"; then
      TOTAL_DONE=$((TOTAL_DONE + 1))
    else
      TOTAL_FAIL=$((TOTAL_FAIL + 1))
      echo "[WARN] Failed ${game} Phase ${phase} - continuing"
    fi

    sleep 5
  done

  echo "[GAME DONE] ${game} - Done=${TOTAL_DONE}, Failed=${TOTAL_FAIL}"
done

echo ""
echo "=============================================================="
echo "COMPLETE: Done=${TOTAL_DONE}, Failed=${TOTAL_FAIL}"
echo "=============================================================="
