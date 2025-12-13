# Sanity GraphQL Mock Server

Lightweight GraphQL server that mocks Sanity API responses for testing migration workflows.

## Quick Start

### Run with Docker

```bash
# Build the image
docker build -t sanity-mock .

# Run the container
docker run -p 4000:4000 sanity-mock
```

### Run locally (development)

```bash
# Install dependencies
npm install

# Start server with auto-reload
npm run dev
```

Server runs at: `http://localhost:4000/graphql`

## Available Queries

### All Lessons

```graphql
query {
  allLesson {
    _id
    title
    slug {
      current
    }
    eggheadLessonId
    state
    description {
      _type
      children {
        text
      }
    }
    collaborators {
      _ref
      role
    }
    softwareLibraries {
      name
      version
      url
    }
  }
}
```

### Single Lesson by Slug

```graphql
query {
  Lesson(slug: "introduction-to-typescript") {
    _id
    title
    description {
      children {
        text
      }
    }
  }
}
```

### All Courses

```graphql
query {
  allCourse {
    _id
    title
    slug {
      current
    }
    eggheadSeriesId
    lessons {
      _ref
      _key
    }
  }
}
```

### Single Course by Slug

```graphql
query {
  Course(slug: "modern-typescript-fundamentals") {
    _id
    title
    lessons {
      _ref
    }
  }
}
```

## Test Data

**Lessons** (5 total):

- `introduction-to-typescript` (published, eggheadLessonId: 10001)
- `react-server-components` (published, eggheadLessonId: 10002)
- `graphql-queries-apollo` (published, eggheadLessonId: 10003)
- `testing-with-vitest` (published, eggheadLessonId: 10004)
- `draft-lesson-example` (draft, eggheadLessonId: 10005)

**Courses** (2 total):

- `modern-typescript-fundamentals` (eggheadSeriesId: 5001)
- `react-server-components-deep-dive` (eggheadSeriesId: 5002)

## Files

- `server.ts` - GraphQL Yoga server setup
- `schema.ts` - GraphQL type definitions
- `data.ts` - Mock test data
- `package.json` - Dependencies (graphql-yoga, graphql)
- `Dockerfile` - Container setup

## Usage in docker-compose

```yaml
services:
  sanity-mock:
    build: ./docker/sanity-mock
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
```

## Schema Notes

- **Portable Text** is simplified: `[{ _type: 'block', children: [{ _type: 'span', text: '...' }] }]`
- **Collaborators** use `_ref` pattern (not resolved to full objects)
- **Lessons** include `eggheadLessonId` for Rails mapping
- **Courses** include `eggheadSeriesId` for Rails series mapping
- **State** enum: `draft`, `published`, `retired`
