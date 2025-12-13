export const typeDefs = /* GraphQL */ `
  type Query {
    allLesson: [Lesson!]!
    allCourse: [Course!]!
    Lesson(slug: String!): Lesson
    Course(slug: String!): Course
  }

  type Lesson {
    _id: ID!
    _type: String!
    _createdAt: String!
    title: String!
    slug: Slug!
    description: [PortableTextBlock!]
    body: [PortableTextBlock!]
    thumbnailUrl: String
    collaborators: [Collaborator!]
    softwareLibraries: [SoftwareLibrary!]
    resources: [Resource!]
    eggheadLessonId: Int!
    state: ContentState!
  }

  type Course {
    _id: ID!
    _type: String!
    _createdAt: String!
    title: String!
    slug: Slug!
    description: [PortableTextBlock!]
    image: Image
    lessons: [LessonReference!]
    collaborators: [Collaborator!]
    eggheadSeriesId: Int!
    state: ContentState!
  }

  type Slug {
    current: String!
  }

  type PortableTextBlock {
    _type: String!
    _key: String
    style: String
    children: [PortableTextSpan!]
  }

  type PortableTextSpan {
    _type: String!
    text: String!
    marks: [String!]
  }

  type Collaborator {
    _ref: String!
    role: CollaboratorRole
  }

  type SoftwareLibrary {
    name: String!
    version: String
    url: String
  }

  type Resource {
    title: String!
    url: String!
    type: ResourceType!
  }

  type Image {
    asset: ImageAsset!
  }

  type ImageAsset {
    _ref: String!
  }

  type LessonReference {
    _ref: String!
    _key: String!
  }

  enum ContentState {
    draft
    published
    retired
  }

  enum CollaboratorRole {
    instructor
    presenter
  }

  enum ResourceType {
    article
    documentation
    repository
  }
`;
