#!/bin/bash
# Stop hook: before the session may end, typecheck, check the architecture rules
# and run the tests for changed files. Exit 2 blocks the stop and feeds the
# output back to Claude. Skipped when nothing changed (Q&A turns cost nothing),
# when only non-code files changed (*.md, docs/), and when this is already the
# follow-up to a blocked stop (stop_hook_active). tsc runs only when a .ts/.tsx
# file changed (audit H-01).
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# stdin is the hook's JSON; honour stop_hook_active so a failing check can't loop forever.
ACTIVE=$(node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
  try { console.log(JSON.parse(input).stop_hook_active === true ? "true" : "false"); } catch { console.log("false"); }
});' 2>/dev/null)
if [ "$ACTIVE" = "true" ]; then exit 0; fi

# Changed paths (staged, unstaged, untracked), one per line. A rename
# "old -> new" counts as the new path.
CHANGED=$(git status --porcelain --untracked-files=all 2>/dev/null | cut -c4- | sed 's/.* -> //; s/^"//; s/"$//')

# Clean tree: nothing to verify.
if [ -z "$CHANGED" ]; then exit 0; fi

# Only Markdown or docs/ changed: nothing tsc, the rules or Jest would see.
CODE=$(printf '%s\n' "$CHANGED" | grep -v -E '\.md$|^docs/')
if [ -z "$CODE" ]; then exit 0; fi

fail() {
  echo "$2" >&2
  echo "" >&2
  echo "verify.sh: $1 failed — fix it before ending the session." >&2
  exit 2
}

if printf '%s\n' "$CODE" | grep -q -E '\.tsx?$'; then
  OUTPUT=$(npx tsc --noEmit --incremental 2>&1) || fail "typecheck (tsc)" "$OUTPUT"
  OUTPUT=$(npx tsc -p tsconfig.strict.json --noEmit --incremental 2>&1) || fail "typecheck (tsc, strict project)" "$OUTPUT"
fi
OUTPUT=$(node scripts/check-architecture.mjs 2>&1) || fail "check-architecture" "$OUTPUT"
# The architecture script's own tests, only when scripts/ changed.
if printf '%s\n' "$CODE" | grep -q '^scripts/'; then
  OUTPUT=$(npm run --silent test:tooling 2>&1) || fail "tooling tests (node --test scripts/)" "$OUTPUT"
fi
OUTPUT=$(npx jest --onlyChanged --passWithNoTests --silent 2>&1) || fail "tests (jest --onlyChanged)" "$OUTPUT"
exit 0
