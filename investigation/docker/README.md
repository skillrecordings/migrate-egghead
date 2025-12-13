# Docker Test Infrastructure

PostgreSQL test database for migration development and testing.

## What's Inside

- **PostgreSQL 14** container
- **Rails schema** (lessons, series, playlists, tracklists, users, tags, taggings)
- **Seed data**:
  - 3 users (2 instructors, 1 student)
  - 2 instructors (Kent Dodds, Dan Abramov)
  - 2 courses (React Hooks, Advanced TypeScript)
  - 10 lessons (5 per course)
  - 5 tags (react, javascript, typescript, testing, hooks)
  - 1 playlist with 3 lessons

## Quick Start

```bash
# Start the database
cd investigation/docker
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop the database
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

## Connection Details

- **Host**: localhost
- **Port**: 5433 (avoiding conflict with local PostgreSQL on 5432)
- **Database**: egghead_test
- **User**: postgres
- **Password**: postgres

### Connection String

```
postgresql://postgres:postgres@localhost:5433/egghead_test
```

## Testing Queries

```bash
# Connect to psql
docker exec -it egghead_test_postgres psql -U postgres -d egghead_test

# List tables
\dt

# View lessons
SELECT id, title, slug, series_id FROM lessons ORDER BY id;

# View courses with instructor
SELECT s.id, s.title, i.first_name, i.last_name
FROM series s
JOIN instructors i ON s.instructor_id = i.id;

# View lessons by course
SELECT s.title as course, l.title as lesson, l.series_row_order
FROM lessons l
JOIN series s ON l.series_id = s.id
ORDER BY s.id, l.series_row_order;

# View tag usage
SELECT t.name, COUNT(*) as count
FROM tags t
JOIN taggings tg ON tg.tag_id = t.id
GROUP BY t.name
ORDER BY count DESC;
```

## File Structure

```
docker/
├── docker-compose.yml       # Container orchestration
├── postgres/
│   ├── init.sql             # Schema definition
│   └── seed.sql             # Test data
└── README.md                # This file
```

## Schema Tables

- **users** - User accounts (3 sample users)
- **instructors** - Instructor profiles (2 instructors)
- **series** - Courses (2 courses)
- **lessons** - Video lessons (10 lessons)
- **playlists** - User-created playlists (1 sample)
- **tracklists** - Playlist membership (3 lessons in playlist)
- **tags** - Content tags (5 tags)
- **taggings** - Tag relationships (polymorphic)

## Use Cases

### 1. Migration Script Development

Test migration scripts against a clean, isolated database:

```typescript
import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    "postgresql://postgres:postgres@localhost:5433/egghead_test",
});

// Test your migration logic
```

### 2. Integration Tests

```typescript
describe("Lesson Migration", () => {
  beforeEach(async () => {
    // Reset to seed state
    await pool.query("TRUNCATE lessons CASCADE");
    // Re-run seed
  });
});
```

### 3. Schema Validation

Verify Coursebuilder schema compatibility with Rails schema.

## Health Check

The container includes a health check that verifies PostgreSQL is ready:

```bash
# Check health status
docker compose ps

# Should show "healthy" after ~5 seconds
```

## Troubleshooting

### Port already in use

If port 5433 is already in use, edit `docker-compose.yml`:

```yaml
ports:
  - "5434:5432" # Change to any available port
```

### Reset database to seed state

```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Recreate with seed data
```

### View initialization logs

```bash
docker compose logs postgres
```

## Next Steps

1. **Add more tables** - Expand init.sql as needed (subscriptions, progress, etc.)
2. **Add migration validation** - Create test scripts to verify data integrity
3. **Integration tests** - Write automated tests against this database
4. **MySQL container** - Add Coursebuilder's MySQL for end-to-end testing
