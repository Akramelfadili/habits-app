#!/bin/bash
# Runs after every Edit/Write tool call. Formats and lints the whole project with Biome.
# Kept simple (whole-project) rather than parsing the hook's stdin JSON for the single
# changed file — fine at this project's size; revisit if it ever feels slow.
npx biome check --write . 2>&1
exit 0
