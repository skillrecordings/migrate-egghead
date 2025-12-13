-- Seed data for egghead test database
-- Representative sample: 2 instructors, 2 courses (series), 10 lessons, 5 tags

-- Insert Users
INSERT INTO users (id, email, first_name, last_name, avatar_url, created_at, updated_at, confirmed_at) VALUES
(1, 'kent@example.com', 'Kent', 'Dodds', 'https://example.com/avatars/kent.jpg', '2020-01-01 00:00:00', '2020-01-01 00:00:00', '2020-01-01 00:00:00'),
(2, 'dan@example.com', 'Dan', 'Abramov', 'https://example.com/avatars/dan.jpg', '2020-01-02 00:00:00', '2020-01-02 00:00:00', '2020-01-02 00:00:00'),
(3, 'student@example.com', 'Test', 'Student', NULL, '2020-01-03 00:00:00', '2020-01-03 00:00:00', '2020-01-03 00:00:00');

-- Insert Instructors
INSERT INTO instructors (id, user_id, email, first_name, last_name, slug, state, created_at, updated_at) VALUES
(1, 1, 'kent@example.com', 'Kent', 'Dodds', 'kent-dodds', 'published', '2020-01-01 00:00:00', '2020-01-01 00:00:00'),
(2, 2, 'dan@example.com', 'Dan', 'Abramov', 'dan-abramov', 'published', '2020-01-02 00:00:00', '2020-01-02 00:00:00');

-- Insert Tags
INSERT INTO tags (id, name, slug, description, taggings_count) VALUES
(1, 'react', 'react', 'React JavaScript library', 15),
(2, 'javascript', 'javascript', 'JavaScript programming language', 20),
(3, 'typescript', 'typescript', 'TypeScript programming language', 8),
(4, 'testing', 'testing', 'Software testing practices', 5),
(5, 'hooks', 'hooks', 'React Hooks', 7);

-- Insert Series (Courses)
INSERT INTO series (id, title, slug, description, summary, instructor_id, state, visibility_state, is_complete, published_at, created_at, updated_at) VALUES
(1, 'React Hooks for Beginners', 'react-hooks-for-beginners', 'Learn how to use React Hooks to build modern React applications', 'A comprehensive guide to React Hooks including useState, useEffect, and custom hooks', 1, 'published', 'indexed', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00'),
(2, 'Advanced TypeScript', 'advanced-typescript', 'Master advanced TypeScript patterns and techniques', 'Deep dive into TypeScript generics, conditional types, and type inference', 2, 'published', 'indexed', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00');

-- Insert Lessons for Course 1 (React Hooks)
INSERT INTO lessons (id, title, slug, summary, duration, state, visibility_state, instructor_id, series_id, series_row_order, current_video_hls_url, published, published_at, created_at, updated_at) VALUES
(1, 'Introduction to React Hooks', 'introduction-to-react-hooks', 'Learn what React Hooks are and why they were introduced', 180, 'published', 'indexed', 1, 1, 1, 'https://stream.mux.com/example1.m3u8', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00'),
(2, 'Using useState Hook', 'using-usestate-hook', 'Master the useState hook for managing component state', 240, 'published', 'indexed', 1, 1, 2, 'https://stream.mux.com/example2.m3u8', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00'),
(3, 'Using useEffect Hook', 'using-useeffect-hook', 'Learn how to handle side effects with useEffect', 300, 'published', 'indexed', 1, 1, 3, 'https://stream.mux.com/example3.m3u8', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00'),
(4, 'Custom Hooks Patterns', 'custom-hooks-patterns', 'Build reusable custom hooks for common patterns', 360, 'published', 'indexed', 1, 1, 4, 'https://stream.mux.com/example4.m3u8', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00'),
(5, 'useContext and useReducer', 'usecontext-and-usereducer', 'Manage complex state with useContext and useReducer', 420, 'published', 'indexed', 1, 1, 5, 'https://stream.mux.com/example5.m3u8', true, '2021-03-15 00:00:00', '2021-03-01 00:00:00', '2021-03-15 00:00:00');

-- Insert Lessons for Course 2 (TypeScript)
INSERT INTO lessons (id, title, slug, summary, duration, state, visibility_state, instructor_id, series_id, series_row_order, current_video_hls_url, published, published_at, created_at, updated_at) VALUES
(6, 'TypeScript Generics Fundamentals', 'typescript-generics-fundamentals', 'Understand the power of TypeScript generics', 270, 'published', 'indexed', 2, 2, 1, 'https://stream.mux.com/example6.m3u8', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00'),
(7, 'Conditional Types in TypeScript', 'conditional-types-in-typescript', 'Master conditional types for advanced type manipulation', 330, 'published', 'indexed', 2, 2, 2, 'https://stream.mux.com/example7.m3u8', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00'),
(8, 'Mapped Types and Type Inference', 'mapped-types-and-type-inference', 'Learn how to leverage TypeScript type inference', 290, 'published', 'indexed', 2, 2, 3, 'https://stream.mux.com/example8.m3u8', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00'),
(9, 'Template Literal Types', 'template-literal-types', 'Use template literal types for string manipulation at the type level', 250, 'published', 'indexed', 2, 2, 4, 'https://stream.mux.com/example9.m3u8', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00'),
(10, 'Advanced Type Utilities', 'advanced-type-utilities', 'Build powerful type utilities for your TypeScript projects', 340, 'published', 'indexed', 2, 2, 5, 'https://stream.mux.com/example10.m3u8', true, '2021-06-01 00:00:00', '2021-05-15 00:00:00', '2021-06-01 00:00:00');

-- Insert Taggings (lesson tags)
-- React Hooks course lessons tagged with 'react' and 'hooks'
INSERT INTO taggings (tag_id, taggable_id, taggable_type, context) VALUES
-- Course 1 lessons
(1, 1, 'Lesson', 'tags'),  -- react
(5, 1, 'Lesson', 'tags'),  -- hooks
(1, 2, 'Lesson', 'tags'),
(5, 2, 'Lesson', 'tags'),
(1, 3, 'Lesson', 'tags'),
(5, 3, 'Lesson', 'tags'),
(1, 4, 'Lesson', 'tags'),
(5, 4, 'Lesson', 'tags'),
(1, 5, 'Lesson', 'tags'),
(5, 5, 'Lesson', 'tags'),

-- TypeScript course lessons tagged with 'typescript'
(3, 6, 'Lesson', 'tags'),
(3, 7, 'Lesson', 'tags'),
(3, 8, 'Lesson', 'tags'),
(3, 9, 'Lesson', 'tags'),
(3, 10, 'Lesson', 'tags'),

-- Some lessons also tagged with 'javascript'
(2, 1, 'Lesson', 'tags'),
(2, 6, 'Lesson', 'tags');

-- Tag the series
INSERT INTO taggings (tag_id, taggable_id, taggable_type, context) VALUES
(1, 1, 'Series', 'tags'),  -- React Hooks course
(5, 1, 'Series', 'tags'),
(2, 1, 'Series', 'tags'),
(3, 2, 'Series', 'tags'),  -- TypeScript course
(2, 2, 'Series', 'tags');

-- Create a sample playlist
INSERT INTO playlists (id, title, slug, description, owner_id, access_state, state, visibility_state, published_at, created_at, updated_at) VALUES
(1, 'React Fundamentals Path', 'react-fundamentals-path', 'A curated learning path for React fundamentals', 3, 'free', 'published', 'indexed', '2021-07-01 00:00:00', '2021-06-15 00:00:00', '2021-07-01 00:00:00');

-- Add some lessons to the playlist via tracklists
INSERT INTO tracklists (playlist_id, tracklistable_id, tracklistable_type, row_order) VALUES
(1, 1, 'Lesson', 1),
(1, 2, 'Lesson', 2),
(1, 3, 'Lesson', 3);

-- Reset sequences to continue from current max values
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('instructors_id_seq', (SELECT MAX(id) FROM instructors));
SELECT setval('tags_id_seq', (SELECT MAX(id) FROM tags));
SELECT setval('series_id_seq', (SELECT MAX(id) FROM series));
SELECT setval('lessons_id_seq', (SELECT MAX(id) FROM lessons));
SELECT setval('playlists_id_seq', (SELECT MAX(id) FROM playlists));
SELECT setval('taggings_id_seq', (SELECT MAX(id) FROM taggings));
SELECT setval('tracklists_id_seq', (SELECT MAX(id) FROM tracklists));
