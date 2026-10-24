#!/bin/bash
# PostToolUse hook (Edit|Write): formats and lints ONLY the file that was just
# edited, using the path from the hook's JSON on stdin (no jq needed). Output is
# shown only when Biome finds something it could not fix itself. Never blocks.
FILE=$(node -e '
let input = "";
process.stdin.on("data", (chunk) => (input += chunk)).on("end", () => {
  try { console.log(JSON.parse(input).tool_input?.file_path ?? ""); } catch { console.log(""); }
});')

# Only files Biome handles; skip anything outside the project.
case "$FILE" in
  "$CLAUDE_PROJECT_DIR"/*.ts|"$CLAUDE_PROJECT_DIR"/*.tsx|"$CLAUDE_PROJECT_DIR"/*.js|"$CLAUDE_PROJECT_DIR"/*.jsx|\
  "$CLAUDE_PROJECT_DIR"/*.mjs|"$CLAUDE_PROJECT_DIR"/*.cjs|"$CLAUDE_PROJECT_DIR"/*.json|"$CLAUDE_PROJECT_DIR"/*.jsonc) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
OUTPUT=$(npx biome check --write --no-errors-on-unmatched "$FILE" 2>&1)
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo "$OUTPUT"
fi
exit 0
