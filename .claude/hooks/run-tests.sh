#!/bin/bash
# Runs before a Claude Code session is allowed to end. If tests fail, exit 2 to block Stop.
npm test -- --watchAll=false --silent
if [ $? -ne 0 ]; then
  echo "Tests are failing — fix before ending the session." >&2
  exit 2
fi
exit 0
