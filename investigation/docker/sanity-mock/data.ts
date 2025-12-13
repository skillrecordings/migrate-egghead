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
  {
    _id: "lesson-claude-1",
    _type: "lesson",
    _createdAt: "2024-11-15T10:00:00Z",
    title: "Getting Started with Claude Code CLI",
    slug: { current: "getting-started-claude-code-cli" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-1",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Install and configure Claude Code CLI for AI-powered development workflows.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-1",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn how to install Claude Code CLI, set up authentication, and run your first AI-assisted coding session.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-code-intro.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [
      {
        title: "Claude Code Documentation",
        url: "https://docs.anthropic.com/claude-code",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10685,
    state: "published",
  },
  {
    _id: "lesson-claude-2",
    _type: "lesson",
    _createdAt: "2024-11-16T10:00:00Z",
    title: "Navigating Codebases with AI",
    slug: { current: "navigating-codebases-with-ai" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-2",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Use Claude Code to explore and understand large codebases quickly.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-2",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Discover how to ask Claude about code architecture, find functions, and trace dependencies across your project.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-navigate.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [],
    eggheadLessonId: 10686,
    state: "published",
  },
  {
    _id: "lesson-claude-3",
    _type: "lesson",
    _createdAt: "2024-11-17T10:00:00Z",
    title: "Refactoring Code with Claude",
    slug: { current: "refactoring-code-with-claude" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-3",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn safe refactoring patterns using AI assistance and automated testing.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-3",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Master the art of refactoring with Claude: extract functions, rename variables, and modernize patterns safely.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-refactor.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
      {
        name: "typescript",
        version: "5.3.0",
        url: "https://www.typescriptlang.org/",
      },
    ],
    resources: [],
    eggheadLessonId: 10687,
    state: "published",
  },
  {
    _id: "lesson-claude-4",
    _type: "lesson",
    _createdAt: "2024-11-18T10:00:00Z",
    title: "Writing Tests with AI Assistance",
    slug: { current: "writing-tests-ai-assistance" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-4",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Generate comprehensive test suites using Claude Code's understanding of your codebase.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-4",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn how to prompt Claude to write unit tests, integration tests, and edge case coverage.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-tests.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "vitest",
        version: "1.0.0",
        url: "https://vitest.dev/",
      },
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [],
    eggheadLessonId: 10688,
    state: "published",
  },
  {
    _id: "lesson-claude-5",
    _type: "lesson",
    _createdAt: "2024-11-19T10:00:00Z",
    title: "Debugging with Claude Code",
    slug: { current: "debugging-with-claude-code" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-5",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Track down bugs faster by leveraging AI to analyze stack traces and error patterns.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-5",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Use Claude to interpret error messages, suggest fixes, and prevent similar issues in the future.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-debug.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [],
    eggheadLessonId: 10689,
    state: "published",
  },
  {
    _id: "lesson-claude-6",
    _type: "lesson",
    _createdAt: "2024-11-20T10:00:00Z",
    title: "Context Management and Prompting Strategies",
    slug: { current: "context-management-prompting-strategies" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-6",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Master effective prompting techniques to get the best results from Claude Code.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-6",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Learn how to structure prompts, manage context windows, and communicate clearly with AI for better code generation.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-prompting.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [
      {
        title: "Anthropic Prompt Engineering Guide",
        url: "https://docs.anthropic.com/prompting",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10690,
    state: "published",
  },
  {
    _id: "lesson-claude-7",
    _type: "lesson",
    _createdAt: "2024-11-21T10:00:00Z",
    title: "Building Features with AI Pair Programming",
    slug: { current: "building-features-ai-pair-programming" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-7",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Ship production features faster by collaborating with Claude as your pair programmer.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-7",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "End-to-end workflow: planning, implementation, testing, and code review with AI assistance.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-features.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
      {
        name: "react",
        version: "19.0.0",
        url: "https://react.dev/",
      },
    ],
    resources: [],
    eggheadLessonId: 10691,
    state: "published",
  },
  {
    _id: "lesson-claude-8",
    _type: "lesson",
    _createdAt: "2024-11-22T10:00:00Z",
    title: "Advanced Claude Code Workflows",
    slug: { current: "advanced-claude-code-workflows" },
    description: [
      {
        _type: "block",
        _key: "desc-claude-8",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Custom agents, automation scripts, and power-user techniques for maximum productivity.",
            marks: [],
          },
        ],
      },
    ],
    body: [
      {
        _type: "block",
        _key: "body-claude-8",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Explore advanced patterns: custom MCP servers, multi-agent coordination, and CI/CD integration.",
            marks: [],
          },
        ],
      },
    ],
    thumbnailUrl: "https://example.com/thumbnails/claude-advanced.jpg",
    collaborators: [{ _ref: "instructor-joel", role: "instructor" }],
    softwareLibraries: [
      {
        name: "claude-code",
        version: "1.0.0",
        url: "https://claude.ai/code",
      },
    ],
    resources: [
      {
        title: "Model Context Protocol Specification",
        url: "https://spec.modelcontextprotocol.io",
        type: "documentation",
      },
    ],
    eggheadLessonId: 10692,
    state: "published",
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
  {
    _id: "claude-code-essentials-6d87",
    _type: "course",
    _createdAt: "2024-11-15T10:00:00Z",
    title: "Claude Code Essentials",
    slug: { current: "claude-code-essentials" },
    description: [
      {
        _type: "block",
        _key: "course-desc-claude",
        style: "normal",
        children: [
          {
            _type: "span",
            text: "Master the Claude Code CLI for AI-assisted development. Learn to navigate codebases, run tests, and ship features with AI pair programming.",
            marks: [],
          },
        ],
      },
    ],
    image: {
      asset: { _ref: "image-claude-code" },
    },
    lessons: [
      { _ref: "lesson-claude-1", _key: "lesson-ref-claude-1" },
      { _ref: "lesson-claude-2", _key: "lesson-ref-claude-2" },
      { _ref: "lesson-claude-3", _key: "lesson-ref-claude-3" },
      { _ref: "lesson-claude-4", _key: "lesson-ref-claude-4" },
      { _ref: "lesson-claude-5", _key: "lesson-ref-claude-5" },
      { _ref: "lesson-claude-6", _key: "lesson-ref-claude-6" },
      { _ref: "lesson-claude-7", _key: "lesson-ref-claude-7" },
      { _ref: "lesson-claude-8", _key: "lesson-ref-claude-8" },
    ],
    collaborators: [{ _ref: "instructor-joel", role: null }],
    eggheadSeriesId: null,
    state: "published",
  },
];
