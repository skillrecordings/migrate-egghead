/**
 * Mock data for Sanity GraphQL responses
 * Matches the schema defined in schema.ts
 */

export const lessons = [
  {
    _id: "lesson-1",
    _type: "lesson",
    _createdAt: "2024-01-15T10:00:00Z",
    title: "Introduction to TypeScript",
    slug: { current: "introduction-to-typescript" },
    description: [
      {
        _type: "block",
        _key: "desc1",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn the fundamentals of TypeScript and type safety.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body1",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/typescript-intro.jpg",
    collaborators: [{ _ref: "instructor-1", role: "instructor" }],
    softwareLibraries: [
      {
        name: "typescript",
        version: "5.3.0",
        url: "https://www.typescriptlang.org/",
      },
    ],
    resources: [
      {
        title: "TypeScript Documentation",
        url: "https://www.typescriptlang.org/docs/",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10001,
    state: "published",
  },
  {
    _id: "lesson-2",
    _type: "lesson",
    _createdAt: "2024-01-16T10:00:00Z",
    title: "React Server Components",
    slug: { current: "react-server-components" },
    description: [
      {
        _type: "block",
        _key: "desc2",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Understand how React Server Components work and when to use them.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body2",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Server Components let you render components on the server, reducing bundle size.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/rsc.jpg",
    collaborators: [{ _ref: "instructor-2", role: "instructor" }],
    softwareLibraries: [
      { name: "react", version: "19.0.0", url: "https://react.dev/" },
      { name: "next", version: "15.0.0", url: "https://nextjs.org/" },
    ],
    resources: [
      {
        title: "React Server Components RFC",
        url: "https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10002,
    state: "published",
  },
  {
    _id: "lesson-3",
    _type: "lesson",
    _createdAt: "2024-01-17T10:00:00Z",
    title: "GraphQL Queries with Apollo",
    slug: { current: "graphql-queries-apollo" },
    description: [
      {
        _type: "block",
        _key: "desc3",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn how to fetch data using GraphQL and Apollo Client.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body3",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Apollo Client is a comprehensive state management library for JavaScript.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/graphql-apollo.jpg",
    collaborators: [{ _ref: "instructor-1", role: "instructor" }],
    softwareLibraries: [
      {
        name: "@apollo/client",
        version: "3.8.0",
        url: "https://www.apollographql.com/docs/react/",
      },
      { name: "graphql", version: "16.8.0", url: "https://graphql.org/" },
    ],
    resources: [
      {
        title: "Apollo Client Documentation",
        url: "https://www.apollographql.com/docs/react/",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10003,
    state: "published",
  },
  {
    _id: "lesson-4",
    _type: "lesson",
    _createdAt: "2024-01-18T10:00:00Z",
    title: "Testing with Vitest",
    slug: { current: "testing-with-vitest" },
    description: [
      {
        _type: "block",
        _key: "desc4",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Fast unit testing with Vitest and modern JavaScript.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body4",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Vitest is a blazing fast unit test framework powered by Vite.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/vitest.jpg",
    collaborators: [{ _ref: "instructor-3", role: "instructor" }],
    softwareLibraries: [
      { name: "vitest", version: "1.0.0", url: "https://vitest.dev/" },
    ],
    resources: [
      {
        title: "Vitest Guide",
        url: "https://vitest.dev/guide/",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10004,
    state: "published",
  },
  {
    _id: "lesson-5",
    _type: "lesson",
    _createdAt: "2024-01-19T10:00:00Z",
    title: "Draft Lesson Example",
    slug: { current: "draft-lesson-example" },
    description: [
      {
        _type: "block",
        _key: "desc5",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "This is a draft lesson not yet published.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body5",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Content in progress.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: null,
    collaborators: [],
    softwareLibraries: [],
    resources: [],
    eggheadLessonId: 10005,
    state: "draft",
  },
];

export const courses = [
  {
    _id: "course-1",
    _type: "course",
    _createdAt: "2024-01-15T10:00:00Z",
    title: "Modern TypeScript Fundamentals",
    slug: { current: "modern-typescript-fundamentals" },
    description: [
      {
        _type: "block",
        _key: "course-desc1",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Master TypeScript from the ground up with modern best practices.",
            marks: [],
          },
        ],
      },
    ],
    image: {
      asset: { _ref: "image-abc123" },
    },
    lessons: [
      { _ref: "lesson-1", _key: "lesson-ref-1" },
      { _ref: "lesson-4", _key: "lesson-ref-4" },
    ],
    collaborators: [{ _ref: "instructor-1", role: null }],
    eggheadSeriesId: 5001,
    state: "published",
  },
  {
    _id: "course-2",
    _type: "course",
    _createdAt: "2024-01-16T10:00:00Z",
    title: "React Server Components Deep Dive",
    slug: { current: "react-server-components-deep-dive" },
    description: [
      {
        _type: "block",
        _key: "course-desc2",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Go deep into React Server Components and Next.js App Router patterns.",
            marks: [],
          },
        ],
      },
    ],
    image: {
      asset: { _ref: "image-def456" },
    },
    lessons: [
      { _ref: "lesson-2", _key: "lesson-ref-2" },
      { _ref: "lesson-3", _key: "lesson-ref-3" },
    ],
    collaborators: [{ _ref: "instructor-2", role: null }],
    eggheadSeriesId: 5002,
    state: "published",
  },
];
