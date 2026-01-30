#!/bin/bash

# Detailed Game Audit Script v2
# Properly identifies numeric vs string phase systems

cd /Users/nmac/Downloads/project-atlas-ai-tutor/components

echo "=================================================="
echo "DETAILED GAME RENDERER AUDIT v2"
echo "Generated: $(date)"
echo "=================================================="
echo ""

# Track counts
TOTAL=0
NUMERIC_COUNT=0
STRING_COUNT=0
HYBRID_COUNT=0
HAS_10_QUESTIONS=0

echo "GAME-BY-GAME ANALYSIS"
echo "====================="
echo ""
echo "Format: [Phase System] [Questions] GameName (lines)"
echo "Phase System: NUM=numeric, STR=string, HYB=hybrid"
echo "Questions: Number of test questions detected"
echo ""

for file in *Renderer.tsx; do
    if [[ -f "$file" ]]; then
        TOTAL=$((TOTAL + 1))
        LINES=$(wc -l < "$file" | tr -d ' ')

        # Check for numeric phase system (phase === 0, PHASES[phase])
        NUMERIC_MARKERS=$(grep -E "phase === [0-9]|PHASES\[phase\]|phase === PHASES" "$file" 2>/dev/null | wc -l | tr -d ' ')

        # Check for string phase system (phase === 'hook', etc.)
        STRING_MARKERS=$(grep -E "phase === '(hook|predict|play|review|twist_predict|twist_play|twist_review|transfer|test|mastery)'" "$file" 2>/dev/null | wc -l | tr -d ' ')

        # Count test questions (correct: true markers)
        QUESTION_COUNT=$(grep -c "correct: true" "$file" 2>/dev/null || echo "0")

        # Determine phase system type
        PHASE_TYPE="UNK"
        if [[ "$NUMERIC_MARKERS" -gt "0" && "$STRING_MARKERS" -eq "0" ]]; then
            PHASE_TYPE="NUM"
            NUMERIC_COUNT=$((NUMERIC_COUNT + 1))
        elif [[ "$STRING_MARKERS" -gt "0" && "$NUMERIC_MARKERS" -eq "0" ]]; then
            PHASE_TYPE="STR"
            STRING_COUNT=$((STRING_COUNT + 1))
        elif [[ "$STRING_MARKERS" -gt "0" && "$NUMERIC_MARKERS" -gt "0" ]]; then
            PHASE_TYPE="HYB"
            HYBRID_COUNT=$((HYBRID_COUNT + 1))
        fi

        if [[ "$QUESTION_COUNT" -ge "10" ]]; then
            HAS_10_QUESTIONS=$((HAS_10_QUESTIONS + 1))
        fi

        # Only show problematic games (numeric phase OR missing questions)
        if [[ "$PHASE_TYPE" == "NUM" || "$QUESTION_COUNT" -lt "10" ]]; then
            printf "  [%s] [Q:%2d] %s (%s lines)\n" "$PHASE_TYPE" "$QUESTION_COUNT" "$file" "$LINES"
        fi
    fi
done

echo ""
echo "=================================================="
echo "SUMMARY"
echo "=================================================="
echo "Total Renderers: $TOTAL"
echo ""
echo "By Phase System:"
echo "  - Numeric (NUM) - BROKEN: $NUMERIC_COUNT"
echo "  - String (STR) - Correct: $STRING_COUNT"
echo "  - Hybrid (HYB): $HYBRID_COUNT"
echo ""
echo "By Test Questions:"
echo "  - Has 10+ questions: $HAS_10_QUESTIONS"
echo "  - Missing questions: $((TOTAL - HAS_10_QUESTIONS))"
echo ""
echo "=================================================="
echo "GAMES NEEDING FIXES"
echo "=================================================="
echo ""

# List numeric phase games
echo "1. NUMERIC PHASE GAMES (render blank - CRITICAL):"
echo "   These use 'phase === 0' instead of 'phase === \"hook\"'"
echo ""
for file in *Renderer.tsx; do
    if [[ -f "$file" ]]; then
        NUMERIC_MARKERS=$(grep -E "phase === [0-9]|PHASES\[phase\]" "$file" 2>/dev/null | wc -l | tr -d ' ')
        STRING_MARKERS=$(grep -E "phase === '(hook|predict|play)" "$file" 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$NUMERIC_MARKERS" -gt "0" && "$STRING_MARKERS" -eq "0" ]]; then
            echo "   - $file"
        fi
    fi
done

echo ""
echo "2. GAMES MISSING 10 TEST QUESTIONS:"
echo ""
for file in *Renderer.tsx; do
    if [[ -f "$file" ]]; then
        QUESTION_COUNT=$(grep -c "correct: true" "$file" 2>/dev/null || echo "0")
        if [[ "$QUESTION_COUNT" -lt "10" && "$QUESTION_COUNT" -gt "0" ]]; then
            echo "   - $file (has $QUESTION_COUNT questions)"
        fi
    fi
done

echo ""
echo "3. GAMES WITH NO TEST QUESTIONS AT ALL:"
echo ""
for file in *Renderer.tsx; do
    if [[ -f "$file" ]]; then
        QUESTION_COUNT=$(grep -c "correct: true" "$file" 2>/dev/null || echo "0")
        if [[ "$QUESTION_COUNT" -eq "0" ]]; then
            echo "   - $file"
        fi
    fi
done | head -50
echo "   ... (showing first 50)"
