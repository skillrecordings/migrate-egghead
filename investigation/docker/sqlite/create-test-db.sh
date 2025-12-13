#!/usr/bin/env bash
set -euo pipefail

# Create test SQLite database for egghead video migration testing
# Generates test.db with videos, lessons, courses, and instructors tables

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_FILE="${SCRIPT_DIR}/test.db"
SEED_FILE="${SCRIPT_DIR}/seed.sql"

echo "Creating test SQLite database..."

# Remove existing database if present
if [ -f "$DB_FILE" ]; then
  echo "Removing existing database: $DB_FILE"
  rm "$DB_FILE"
fi

# Create new database from seed file
echo "Running seed.sql..."
sqlite3 "$DB_FILE" < "$SEED_FILE"

# Verify tables were created
echo ""
echo "Verifying database structure..."
TABLE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo "Tables created: $TABLE_COUNT"

# Show record counts
echo ""
echo "Record counts:"
echo "  Instructors: $(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM instructors;")"
echo "  Courses: $(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM courses;")"
echo "  Videos: $(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM videos;")"
echo "  Lessons: $(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM lessons;")"

# Show videos with Mux data
echo ""
echo "Videos with Mux data:"
sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM videos WHERE mux_asset_id IS NOT NULL;" | xargs -I{} echo "  Videos with mux_asset_id: {}"
sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM videos WHERE mux_playback_id IS NOT NULL;" | xargs -I{} echo "  Videos with mux_playback_id: {}"

echo ""
echo "✅ Test database created successfully: $DB_FILE"
echo ""
echo "Usage:"
echo "  sqlite3 $DB_FILE"
echo "  sqlite3 $DB_FILE 'SELECT * FROM videos LIMIT 5;'"
