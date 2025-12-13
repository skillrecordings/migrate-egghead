# Migration Integration Tests

Integration tests for the egghead → Coursebuilder migration flow.

## Prerequisites

### 1. Install vitest

```bash
pnpm add -D vitest
```

### 2. Add MySQL to docker-compose.yml

The MySQL service is not yet in `docker/docker-compose.yml`. Add it:

```yaml
mysql:
  image: mysql:8
  container_name: egghead_test_mysql
  environment:
    MYSQL_ROOT_PASSWORD: mysql
    MYSQL_DATABASE: coursebuilder_test
  ports:
    - "3307:3306"
  volumes:
    - mysql_data:/var/lib/mysql
    - ./mysql/init.sql:/docker-entrypoint-initdb.d/01-init.sql
  healthcheck:
    test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    interval: 5s
    timeout: 5s
    retries: 5
  networks:
    - egghead_test
```

And add the volume:

```yaml
volumes:
  postgres_data:
  mysql_data: # Add this
```

### 3. Start Docker containers

```bash
cd investigation/docker
docker-compose up -d
```

Wait for health checks to pass:

```bash
docker-compose ps
```

All services should show "healthy" status.

### 4. Verify seed data

```bash
# PostgreSQL
docker exec -it egghead_test_postgres psql -U postgres -d egghead_test -c "SELECT COUNT(*) FROM lessons"

# MySQL
docker exec -it egghead_test_mysql mysql -uroot -pmysql coursebuilder_test -e "SHOW TABLES"

# SQLite (local file)
sqlite3 docker/sqlite/test.db "SELECT COUNT(*) FROM lessons"
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test docker-migration

# Run in watch mode
pnpm test --watch
```

## Test Structure

### `docker-migration.test.ts`

Tests the full migration pipeline:

1. **PostgreSQL Read** - Reads a lesson from Rails database
2. **SQLite Lookup** - Gets Mux asset ID from video tracker
3. **MySQL Write** - Creates ContentResource in Coursebuilder
4. **Round-trip Verification** - Validates data integrity

## Test Data

### PostgreSQL (Rails source)

- 10 lessons across 2 courses
- Instructors: Kent Dodds, Dan Abramov
- Lesson IDs: 1-10

### SQLite (Video tracker)

- 10 lessons (IDs 2001-2010)
- 10 videos (IDs 1001-1010)
- All videos have `mux_asset_id` and `mux_playback_id`

### MySQL (Coursebuilder target)

- Empty initially
- Tests create ContentResource records
- Uses system user for `createdById`

## Troubleshooting

### "Connection refused" errors

Docker containers not running:

```bash
cd investigation/docker
docker-compose up -d
```

### "Table not found" in MySQL

Schema not initialized:

```bash
docker exec -it egghead_test_mysql mysql -uroot -pmysql coursebuilder_test < docker/mysql/init.sql
```

### SQLite file not found

Run the seed script:

```bash
cd investigation/docker/sqlite
./create-test-db.sh
```

### Tests fail with "vitest not found"

Install dev dependencies:

```bash
pnpm add -D vitest
```

## Next Steps

After this test passes:

1. Create migration utilities library
2. Add batch processing tests
3. Test error handling (missing video, invalid data)
4. Add performance benchmarks
5. Test idempotency (running migration twice)
