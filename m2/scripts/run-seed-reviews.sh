#!/usr/bin/env bash
# Mac/Linux equivalent of run-seed-reviews.bat — loops the IGDB review
# seeder until review-progress.json is gone.

echo "================================"
echo " Epic Games Review Auto-Seeder"
echo " Press Ctrl+C to stop anytime"
echo "================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

while true; do
  node seed-reviews.mjs
  exit_code=$?

  if [ $exit_code -eq 0 ] && [ ! -f review-progress.json ]; then
    echo ""
    echo "================================"
    echo " All reviews seeded! Done!"
    echo "================================"
    exit 0
  fi

  echo "Waiting 1 second before next run..."
  sleep 1
  echo ""
done
