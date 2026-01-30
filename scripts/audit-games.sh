#!/bin/bash

# Game Audit Script
# Identifies broken/incomplete game renderers

cd /Users/nmac/Downloads/project-atlas-ai-tutor/components

echo "=================================================="
echo "GAME RENDERER AUDIT REPORT"
echo "Generated: $(date)"
echo "=================================================="
echo ""

# Arrays to track different categories
declare -a NUMERIC_PHASE=()
declare -a STRING_PHASE=()
declare -a MISSING_TEST=()
declare -a MISSING_TRANSFER=()
declare -a SHORT_FILES=()
declare -a COMPLETE=()

# Count total
TOTAL=0

for file in *Renderer.tsx; do
    if [[ -f "$file" ]]; then
        TOTAL=$((TOTAL + 1))
        LINES=$(wc -l < "$file" | tr -d ' ')

        # Check phase system
        HAS_STRING_PHASE=$(grep -c "phase === 'hook'" "$file" 2>/dev/null || echo "0")
        HAS_NUMERIC_PHASE=$(grep -c "phase === 0" "$file" 2>/dev/null || echo "0")

        # Check for test questions
        HAS_TEST=$(grep -c "testQuestions" "$file" 2>/dev/null || echo "0")
        TEST_COUNT=$(grep -oP "correct:\s*(true|false)" "$file" 2>/dev/null | wc -l || echo "0")

        # Check for transfer apps
        HAS_TRANSFER=$(grep -c "transferApps\|Real World\|applications" "$file" 2>/dev/null || echo "0")

        # Check for all required phases
        HAS_HOOK=$(grep -c "'hook'" "$file" 2>/dev/null || echo "0")
        HAS_PREDICT=$(grep -c "'predict'" "$file" 2>/dev/null || echo "0")
        HAS_PLAY=$(grep -c "'play'" "$file" 2>/dev/null || echo "0")
        HAS_REVIEW=$(grep -c "'review'" "$file" 2>/dev/null || echo "0")
        HAS_TWIST_PREDICT=$(grep -c "'twist_predict'" "$file" 2>/dev/null || echo "0")
        HAS_TWIST_PLAY=$(grep -c "'twist_play'" "$file" 2>/dev/null || echo "0")
        HAS_TWIST_REVIEW=$(grep -c "'twist_review'" "$file" 2>/dev/null || echo "0")
        HAS_MASTERY=$(grep -c "'mastery'" "$file" 2>/dev/null || echo "0")

        # Categorize
        if [[ "$HAS_NUMERIC_PHASE" -gt "0" && "$HAS_STRING_PHASE" -eq "0" ]]; then
            NUMERIC_PHASE+=("$file ($LINES lines)")
        fi

        if [[ "$HAS_STRING_PHASE" -gt "0" ]]; then
            STRING_PHASE+=("$file ($LINES lines)")
        fi

        if [[ "$HAS_TEST" -eq "0" || "$TEST_COUNT" -lt "10" ]]; then
            MISSING_TEST+=("$file (found $TEST_COUNT questions)")
        fi

        if [[ "$HAS_TRANSFER" -eq "0" ]]; then
            MISSING_TRANSFER+=("$file")
        fi

        if [[ "$LINES" -lt "500" ]]; then
            SHORT_FILES+=("$file ($LINES lines)")
        fi

        # Check if complete (has all string phases + tests + transfer)
        if [[ "$HAS_STRING_PHASE" -gt "0" && "$TEST_COUNT" -ge "10" && "$HAS_TRANSFER" -gt "0" && "$HAS_MASTERY" -gt "0" ]]; then
            COMPLETE+=("$file")
        fi
    fi
done

echo "SUMMARY"
echo "-------"
echo "Total Renderers: $TOTAL"
echo "Using String Phases: ${#STRING_PHASE[@]}"
echo "Using Numeric Phases: ${#NUMERIC_PHASE[@]}"
echo "Complete Games: ${#COMPLETE[@]}"
echo ""

echo "=================================================="
echo "CRITICAL: GAMES USING NUMERIC PHASES (BROKEN)"
echo "These games render blank because phase conditions don't match"
echo "=================================================="
for game in "${NUMERIC_PHASE[@]}"; do
    echo "  - $game"
done
echo ""
echo "Count: ${#NUMERIC_PHASE[@]}"
echo ""

echo "=================================================="
echo "MISSING TEST QUESTIONS (<10 questions)"
echo "=================================================="
for game in "${MISSING_TEST[@]}"; do
    echo "  - $game"
done
echo ""
echo "Count: ${#MISSING_TEST[@]}"
echo ""

echo "=================================================="
echo "SHORT FILES (<500 lines) - May be incomplete"
echo "=================================================="
for game in "${SHORT_FILES[@]}"; do
    echo "  - $game"
done
echo ""
echo "Count: ${#SHORT_FILES[@]}"
echo ""

echo "=================================================="
echo "COMPLETE GAMES (Reference implementations)"
echo "=================================================="
for game in "${COMPLETE[@]}"; do
    echo "  - $game"
done
echo ""
echo "Count: ${#COMPLETE[@]}"
echo ""

echo "=================================================="
echo "RECOMMENDED FIX PRIORITY"
echo "=================================================="
echo "1. Fix NUMERIC PHASE games first (they show blank screens)"
echo "2. Add missing test questions"
echo "3. Add missing transfer applications"
echo "4. Review short files for completeness"
echo ""
echo "Reference template: WaveParticleDualityRenderer.tsx"
echo "Compact template: MetronomeSyncRenderer.tsx"
