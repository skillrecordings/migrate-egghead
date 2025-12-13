import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { courses, lessons } from "./data.js";
import { typeDefs } from "./schema.js";

/**
 * GraphQL resolvers for Sanity mock API
 */
const resolvers = {
  Query: {
    allLesson: () => lessons,

    allCourse: () => courses,

    Lesson: (_parent: unknown, args: { slug: string }) => {
      return (
        lessons.find((lesson) => lesson.slug.current === args.slug) || null
      );
    },

    Course: (_parent: unknown, args: { slug: string }) => {
      return (
        courses.find((course) => course.slug.current === args.slug) || null
      );
    },
  },
};

/**
 * Create GraphQL schema
 */
const schema = createSchema({
  typeDefs,
  resolvers,
});

/**
 * Create GraphQL Yoga server
 */
const yoga = createYoga({
  schema,
  logging: {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  },
});

/**
 * Start HTTP server
 */
const server = createServer(yoga);
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(
    `🚀 Sanity mock GraphQL server running at http://localhost:${PORT}/graphql`,
  );
  console.log("");
  console.log("Available queries:");
  console.log("  - allLesson: [Lesson!]!");
  console.log("  - allCourse: [Course!]!");
  console.log("  - Lesson(slug: String!): Lesson");
  console.log("  - Course(slug: String!): Course");
  console.log("");
  console.log("Test data:");
  console.log(`  - ${lessons.length} lessons`);
  console.log(`  - ${courses.length} courses`);
});
