#!/bin/bash
# Stop hook: before the session may end, typecheck, check the architecture rules
# and run the tests for changed files. Exit 2 blocks the stop and feeds the
# output back to Claude. Skipped when nothing changed (Q&A turns cost nothing)
# and when this is already the follow-up to a blocked stop (stop_hook_active).
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0

# stdin is the hook's JSON; honour stop_hook_active so a failing check can't loop forever.
ACTIVE=$(node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
  try { console.log(JSON.parse(input).stop_hook_active === true ? "true" : "false"); } catch { console.log("false"); }
});' 2>/dev/null)
if [ "$ACTIVE" = "true" ]; then exit 0; fi

# Clean tree: nothing to verify.
if [ -z "$(git status --porcelain 2>/dev/null)" ]; then exit 0; fi

fail() {
  echo "$2" >&2
  echo "" >&2
  echo "verify.sh: $1 failed — fix it before ending the session." >&2
  exit 2
}

OUTPUT=$(npx tsc --noEmit --incremental 2>&1) || fail "typecheck (tsc)" "$OUTPUT"
OUTPUT=$(node scripts/check-architecture.mjs 2>&1) || fail "check-architecture" "$OUTPUT"
# The architecture script's own tests, only when scripts/ changed.
if git status --porcelain | grep -q ' scripts/\|^?? scripts/'; then
  OUTPUT=$(npm run --silent test:tooling 2>&1) || fail "tooling tests (node --test scripts/)" "$OUTPUT"
fi
OUTPUT=$(npx jest --onlyChanged --passWithNoTests --silent 2>&1) || fail "tests (jest --onlyChanged)" "$OUTPUT"
exit 0
