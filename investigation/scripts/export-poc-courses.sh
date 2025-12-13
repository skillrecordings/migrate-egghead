#!/bin/bash
# Export POC courses with REAL schema from production
# 
# This exports:
# 1. Full table schemas (CREATE TABLE statements)
# 2. Data for POC courses and their dependencies
#
# Usage: ./scripts/export-poc-courses.sh

set -e

# Load env
source .env

# Output directory
DOCKER_DIR="./docker/postgres"
mkdir -p "$DOCKER_DIR"

echo "🔍 Exporting schema and POC course data from Rails..."
echo ""

# POC course slugs
COURSE_SLUGS="'fix-common-git-mistakes','claude-code-essentials-6d87'"

echo "📋 Step 1: Export table schemas..."

# Export schema only for the tables we need
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  --table=users \
  --table=instructors \
  --table=series \
  --table=lessons \
  --table=tags \
  --table=taggings \
  --table=playlists \
  --table=tracklists \
  2>/dev/null \
  > "$DOCKER_DIR/init.sql"

echo "   ✅ Schema exported to docker/postgres/init.sql"

echo ""
echo "📋 Step 2: Find related IDs..."

# Get course IDs
COURSE_IDS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT string_agg(id::text, ',') 
  FROM series 
  WHERE slug IN ($COURSE_SLUGS)
")
echo "   Course IDs: $COURSE_IDS"

if [ -z "$COURSE_IDS" ]; then
  echo "   ❌ No courses found! Check slugs."
  exit 1
fi

# Get lesson IDs for these courses
LESSON_IDS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT string_agg(id::text, ',') 
  FROM lessons 
  WHERE series_id IN ($COURSE_IDS)
")
echo "   Lesson IDs: $(echo "$LESSON_IDS" | tr ',' '\n' | wc -l | tr -d ' ') lessons"

# Get instructor IDs
INSTRUCTOR_IDS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT string_agg(DISTINCT instructor_id::text, ',') 
  FROM (
    SELECT instructor_id FROM series WHERE id IN ($COURSE_IDS)
    UNION
    SELECT instructor_id FROM lessons WHERE series_id IN ($COURSE_IDS)
  ) t
")
echo "   Instructor IDs: $INSTRUCTOR_IDS"

# Get user IDs for instructors
USER_IDS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT string_agg(user_id::text, ',') 
  FROM instructors 
  WHERE id IN ($INSTRUCTOR_IDS)
")
echo "   User IDs: $USER_IDS"

# Get tag IDs
TAG_IDS=$(psql "$DATABASE_URL" -t -A -c "
  SELECT COALESCE(string_agg(DISTINCT tag_id::text, ','), '') 
  FROM taggings 
  WHERE (taggable_type = 'Lesson' AND taggable_id IN ($LESSON_IDS))
     OR (taggable_type = 'Series' AND taggable_id IN ($COURSE_IDS))
")
echo "   Tag IDs: $TAG_IDS"

echo ""
echo "📋 Step 3: Export data with pg_dump..."

# Create a temp file with the data export
SEED_FILE="$DOCKER_DIR/seed.sql"

cat > "$SEED_FILE" << EOF
-- POC Course Data Export
-- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
-- Courses: fix-common-git-mistakes, claude-code-essentials-6d87

-- Disable triggers during import
SET session_replication_role = replica;

EOF

# Export users (with anonymized emails)
echo "   Exporting users..."
psql "$DATABASE_URL" -c "
  COPY (
    SELECT 
      id,
      NULL as authentication_token,
      avatar_content_type,
      avatar_file_name,
      avatar_file_size,
      avatar_updated_at,
      avatar_url,
      can_contact,
      city,
      community_status,
      NULL as confirmation_sent_at,
      NULL as confirmation_token,
      NULL as confirmed_at,
      country,
      created_at,
      NULL as current_sign_in_at,
      NULL as current_sign_in_ip,
      NULL as discord_id,
      'instructor' || id || '@test.egghead.io' as email,
      'redacted' as encrypted_password,
      favorite_playlist_id,
      first_name,
      false as has_random_password,
      is_banned,
      is_invited_to_slack,
      kvstore,
      last_name,
      NULL as last_sign_in_at,
      NULL as last_sign_in_ip,
      managed_subscription_id,
      provider,
      NULL as remember_created_at,
      NULL as reset_password_sent_at,
      NULL as reset_password_token,
      sign_in_count,
      NULL as slack_id,
      state,
      NULL as trial_started_at,
      uid,
      NULL as unconfirmed_email,
      updated_at
    FROM users 
    WHERE id IN ($USER_IDS)
  ) TO STDOUT WITH CSV HEADER
" > /tmp/users_export.csv

# Convert CSV to SQL INSERT
echo "-- Users (anonymized)" >> "$SEED_FILE"
psql "$DATABASE_URL" -t -A -c "
  SELECT 'INSERT INTO users SELECT * FROM (VALUES ' || 
    string_agg(
      '(' || id || ',' || 
      COALESCE(quote_literal(authentication_token), 'NULL') || ',' ||
      COALESCE(quote_literal(avatar_content_type), 'NULL') || ',' ||
      COALESCE(quote_literal(avatar_file_name), 'NULL') || ',' ||
      COALESCE(avatar_file_size::text, 'NULL') || ',' ||
      COALESCE(quote_literal(avatar_updated_at::text), 'NULL') || ',' ||
      COALESCE(quote_literal(avatar_url), 'NULL') || ',' ||
      can_contact::text || ',' ||
      COALESCE(quote_literal(city), 'NULL') || ',' ||
      COALESCE(quote_literal(community_status), 'NULL') || ',' ||
      'NULL,' || -- confirmation_sent_at
      'NULL,' || -- confirmation_token  
      'NULL,' || -- confirmed_at
      COALESCE(quote_literal(country), 'NULL') || ',' ||
      COALESCE(quote_literal(created_at::text), 'NULL') || ',' ||
      'NULL,' || -- current_sign_in_at
      'NULL,' || -- current_sign_in_ip
      'NULL,' || -- discord_id
      quote_literal('instructor' || id || '@test.egghead.io') || ',' ||
      quote_literal('redacted') || ',' ||
      COALESCE(favorite_playlist_id::text, 'NULL') || ',' ||
      COALESCE(quote_literal(first_name), 'NULL') || ',' ||
      'false,' || -- has_random_password
      COALESCE(is_banned::text, 'false') || ',' ||
      COALESCE(is_invited_to_slack::text, 'false') || ',' ||
      COALESCE(quote_literal(kvstore::text), '''{}''') || '::jsonb,' ||
      COALESCE(quote_literal(last_name), 'NULL') || ',' ||
      'NULL,' || -- last_sign_in_at
      'NULL,' || -- last_sign_in_ip
      COALESCE(managed_subscription_id::text, 'NULL') || ',' ||
      COALESCE(quote_literal(provider), 'NULL') || ',' ||
      'NULL,' || -- remember_created_at
      'NULL,' || -- reset_password_sent_at
      'NULL,' || -- reset_password_token
      COALESCE(sign_in_count::text, '0') || ',' ||
      'NULL,' || -- slack_id
      COALESCE(quote_literal(state), 'NULL') || ',' ||
      'NULL,' || -- trial_started_at
      COALESCE(quote_literal(uid), 'NULL') || ',' ||
      'NULL,' || -- unconfirmed_email
      COALESCE(quote_literal(updated_at::text), 'NULL') ||
      ')'
    , E',\n')
  || ') AS t(id,authentication_token,avatar_content_type,avatar_file_name,avatar_file_size,avatar_updated_at,avatar_url,can_contact,city,community_status,confirmation_sent_at,confirmation_token,confirmed_at,country,created_at,current_sign_in_at,current_sign_in_ip,discord_id,email,encrypted_password,favorite_playlist_id,first_name,has_random_password,is_banned,is_invited_to_slack,kvstore,last_name,last_sign_in_at,last_sign_in_ip,managed_subscription_id,provider,remember_created_at,reset_password_sent_at,reset_password_token,sign_in_count,slack_id,state,trial_started_at,uid,unconfirmed_email,updated_at) ON CONFLICT (id) DO NOTHING;'
  FROM users WHERE id IN ($USER_IDS)
" >> "$SEED_FILE" 2>/dev/null || echo "-- No users to export" >> "$SEED_FILE"

# Use pg_dump --data-only for the rest (simpler)
echo "" >> "$SEED_FILE"
echo "-- Instructors" >> "$SEED_FILE"
pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --table=instructors 2>/dev/null | \
  grep "^INSERT" | \
  grep -E "VALUES \(($INSTRUCTOR_IDS)," >> "$SEED_FILE" || echo "-- No instructors matched" >> "$SEED_FILE"

echo "" >> "$SEED_FILE"
echo "-- Series (courses)" >> "$SEED_FILE"
pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --table=series 2>/dev/null | \
  grep "^INSERT" | \
  grep -E "VALUES \(($COURSE_IDS)," >> "$SEED_FILE" || echo "-- No series matched" >> "$SEED_FILE"

echo "" >> "$SEED_FILE"
echo "-- Lessons" >> "$SEED_FILE"
# For lessons, we need a different approach since there are many
LESSON_PATTERN=$(echo "$LESSON_IDS" | tr ',' '|')
pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --table=lessons 2>/dev/null | \
  grep "^INSERT" | \
  grep -E "VALUES \(($LESSON_PATTERN)," >> "$SEED_FILE" || echo "-- No lessons matched" >> "$SEED_FILE"

if [ -n "$TAG_IDS" ]; then
  echo "" >> "$SEED_FILE"
  echo "-- Tags" >> "$SEED_FILE"
  TAG_PATTERN=$(echo "$TAG_IDS" | tr ',' '|')
  pg_dump "$DATABASE_URL" --data-only --inserts --no-owner --table=tags 2>/dev/null | \
    grep "^INSERT" | \
    grep -E "VALUES \(($TAG_PATTERN)," >> "$SEED_FILE" || echo "-- No tags matched" >> "$SEED_FILE"

  echo "" >> "$SEED_FILE"
  echo "-- Taggings" >> "$SEED_FILE"
  # Export taggings that match our lessons/courses
  psql "$DATABASE_URL" -t -A -c "
    SELECT 'INSERT INTO taggings (id, context, created_at, tag_id, taggable_id, taggable_type, tagger_id, tagger_type, updated_at) VALUES (' ||
      id || ',' ||
      COALESCE(quote_literal(context), 'NULL') || ',' ||
      COALESCE(quote_literal(created_at::text), 'NULL') || ',' ||
      tag_id || ',' ||
      taggable_id || ',' ||
      quote_literal(taggable_type) || ',' ||
      COALESCE(tagger_id::text, 'NULL') || ',' ||
      COALESCE(quote_literal(tagger_type), 'NULL') || ',' ||
      COALESCE(quote_literal(updated_at::text), 'NULL') ||
      ') ON CONFLICT DO NOTHING;'
    FROM taggings 
    WHERE (taggable_type = 'Lesson' AND taggable_id IN ($LESSON_IDS))
       OR (taggable_type = 'Series' AND taggable_id IN ($COURSE_IDS))
  " >> "$SEED_FILE"
fi

# Re-enable triggers
echo "" >> "$SEED_FILE"
echo "-- Re-enable triggers" >> "$SEED_FILE"
echo "SET session_replication_role = DEFAULT;" >> "$SEED_FILE"

# Reset sequences
echo "" >> "$SEED_FILE"
echo "-- Reset sequences" >> "$SEED_FILE"
echo "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));" >> "$SEED_FILE"
echo "SELECT setval('instructors_id_seq', COALESCE((SELECT MAX(id) FROM instructors), 1));" >> "$SEED_FILE"
echo "SELECT setval('series_id_seq', COALESCE((SELECT MAX(id) FROM series), 1));" >> "$SEED_FILE"
echo "SELECT setval('lessons_id_seq', COALESCE((SELECT MAX(id) FROM lessons), 1));" >> "$SEED_FILE"
echo "SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 1));" >> "$SEED_FILE"
echo "SELECT setval('taggings_id_seq', COALESCE((SELECT MAX(id) FROM taggings), 1));" >> "$SEED_FILE"

echo ""
echo "📊 Export Summary:"
USERS_COUNT=$(grep -c "^INSERT INTO users" "$SEED_FILE" 2>/dev/null || echo "0")
INSTRUCTORS_COUNT=$(grep -c "^INSERT INTO instructors" "$SEED_FILE" 2>/dev/null || echo "0")
SERIES_COUNT=$(grep -c "^INSERT INTO series" "$SEED_FILE" 2>/dev/null || echo "0")
LESSONS_COUNT=$(grep -c "^INSERT INTO lessons" "$SEED_FILE" 2>/dev/null || echo "0")
TAGS_COUNT=$(grep -c "^INSERT INTO tags" "$SEED_FILE" 2>/dev/null || echo "0")
TAGGINGS_COUNT=$(grep -c "^INSERT INTO taggings" "$SEED_FILE" 2>/dev/null || echo "0")

echo "   Users:       $USERS_COUNT"
echo "   Instructors: $INSTRUCTORS_COUNT"
echo "   Series:      $SERIES_COUNT"
echo "   Lessons:     $LESSONS_COUNT"
echo "   Tags:        $TAGS_COUNT"
echo "   Taggings:    $TAGGINGS_COUNT"

echo ""
echo "   Schema: $(wc -l < "$DOCKER_DIR/init.sql" | tr -d ' ') lines"
echo "   Seed:   $(wc -l < "$SEED_FILE" | tr -d ' ') lines"

echo ""
echo "✨ Done! Files written to docker/postgres/"
echo ""
echo "Next steps:"
echo "  cd docker && docker-compose down -v && docker-compose up -d"
