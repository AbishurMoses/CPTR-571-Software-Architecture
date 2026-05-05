#!/usr/bin/env bash
# Mac/Linux equivalent of run-seed.bat — keeps invoking the seeder
# until the progress file is gone (meaning the whole catalog is seeded).

echo "================================"
echo " Epic Games Auto-Seeder"
echo " Press Ctrl+C to stop anytime"
echo "================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

while true; do
  node seed-epic-browser.mjs
  exit_code=$?

  # Fully complete only when exit 0 AND no progress file left.
  if [ $exit_code -eq 0 ] && [ ! -f seed-progress.json ]; then
    echo ""
    echo "================================"
    echo " All games seeded! Done!"
    echo "================================"
    exit 0
  fi

  echo "Waiting 1 second before next run..."
  sleep 1
  echo ""
done
