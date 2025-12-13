#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting migration test environment...${NC}"

# Change to docker directory
cd "$(dirname "$0")"

# Start containers
echo -e "${YELLOW}Starting Docker containers...${NC}"
docker-compose up -d

# Wait for PostgreSQL
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}PostgreSQL is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}PostgreSQL failed to start${NC}"
    docker-compose logs postgres
    docker-compose down
    exit 1
  fi
  sleep 1
done

# Wait for MySQL
echo -e "${YELLOW}Waiting for MySQL...${NC}"
for i in {1..30}; do
  if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -proot --silent > /dev/null 2>&1; then
    echo -e "${GREEN}MySQL is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}MySQL failed to start${NC}"
    docker-compose logs mysql
    docker-compose down
    exit 1
  fi
  sleep 1
done

# Wait for Sanity mock
echo -e "${YELLOW}Waiting for Sanity mock server...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}Sanity mock is ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}Sanity mock failed to start${NC}"
    docker-compose logs sanity-mock
    docker-compose down
    exit 1
  fi
  sleep 1
done

# Create SQLite database
echo -e "${YELLOW}Initializing SQLite database...${NC}"
cd ..
node docker/sqlite/create-db.mjs
cd docker

# Run migration tests
echo -e "${GREEN}Running migration tests...${NC}"
cd ..
pnpm test:docker
TEST_EXIT_CODE=$?

# Tear down containers
echo -e "${YELLOW}Stopping Docker containers...${NC}"
cd docker
docker-compose down

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
else
  echo -e "${RED}Tests failed with exit code $TEST_EXIT_CODE${NC}"
fi

exit $TEST_EXIT_CODE
