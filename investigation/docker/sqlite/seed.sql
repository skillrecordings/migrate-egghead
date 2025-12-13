-- Test database schema and seed data for egghead video migration testing
-- Matches download-egghead/egghead_videos.db schema

-- Create tables
CREATE TABLE IF NOT EXISTS "instructors" (
  "id" INTEGER NOT NULL,
  "full_name" VARCHAR,
  "slug" VARCHAR NOT NULL,
  "avatar_url" VARCHAR,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "courses" (
  "id" INTEGER NOT NULL DEFAULT '',
  "slug" VARCHAR NOT NULL,
  "image_url" VARCHAR,
  "instructor_id" INT,
  "state" VARCHAR NOT NULL DEFAULT 'draft',
  "access_state" VARCHAR NOT NULL DEFAULT 'indexed',
  "body" TEXT,
  "title" VARCHAR NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "videos" (
  "id" INT NOT NULL,
  "slug" VARCHAR NOT NULL DEFAULT NULL,
  "source_url" VARCHAR,
  "subtitles_url" VARCHAR,
  "size" INT,
  "mux_asset_id" VARCHAR,
  "state" VARCHAR NOT NULL DEFAULT 'unprocessed',
  "mux_playback_id" TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS "lessons" (
  "id" INTEGER,
  "video_id" INTEGER,
  "instructor_id" INTEGER NOT NULL,
  "slug" VARCHAR NOT NULL,
  "state" VARCHAR NOT NULL DEFAULT 'draft',
  "course_id" INTEGER,
  "title" VARCHAR NOT NULL,
  "body" TEXT,
  PRIMARY KEY (id)
);

-- Seed instructors
INSERT INTO instructors (id, full_name, slug, avatar_url) VALUES
  (1, 'Kent C. Dodds', 'kent-c-dodds', 'https://example.com/kent.jpg'),
  (2, 'Dan Abramov', 'dan-abramov', 'https://example.com/dan.jpg');

-- Seed courses
INSERT INTO courses (id, slug, title, body, instructor_id, state, access_state) VALUES
  (100, 'test-react-course', 'Test React Fundamentals', 'Learn React basics in this test course', 1, 'published', 'indexed'),
  (101, 'test-typescript-course', 'Test TypeScript Essentials', 'Master TypeScript in this test course', 2, 'published', 'indexed');

-- Seed videos (all with mux_asset_id and mux_playback_id)
INSERT INTO videos (id, slug, source_url, subtitles_url, size, mux_asset_id, mux_playback_id, state) VALUES
  (1001, 'test-video-1', 'https://cloudfront.example.com/video1.mp4', 'https://example.com/subs1.srt', 50000000, 'test-mux-asset-1', 'test-playback-1', 'updated'),
  (1002, 'test-video-2', 'https://cloudfront.example.com/video2.mp4', 'https://example.com/subs2.srt', 60000000, 'test-mux-asset-2', 'test-playback-2', 'updated'),
  (1003, 'test-video-3', 'https://cloudfront.example.com/video3.mp4', 'https://example.com/subs3.srt', 45000000, 'test-mux-asset-3', 'test-playback-3', 'updated'),
  (1004, 'test-video-4', 'https://cloudfront.example.com/video4.mp4', 'https://example.com/subs4.srt', 55000000, 'test-mux-asset-4', 'test-playback-4', 'updated'),
  (1005, 'test-video-5', 'https://cloudfront.example.com/video5.mp4', 'https://example.com/subs5.srt', 48000000, 'test-mux-asset-5', 'test-playback-5', 'updated'),
  (1006, 'test-video-6', 'https://cloudfront.example.com/video6.mp4', 'https://example.com/subs6.srt', 52000000, 'test-mux-asset-6', 'test-playback-6', 'updated'),
  (1007, 'test-video-7', 'https://cloudfront.example.com/video7.mp4', 'https://example.com/subs7.srt', 47000000, 'test-mux-asset-7', 'test-playback-7', 'updated'),
  (1008, 'test-video-8', 'https://cloudfront.example.com/video8.mp4', 'https://example.com/subs8.srt', 51000000, 'test-mux-asset-8', 'test-playback-8', 'updated'),
  (1009, 'test-video-9', 'https://cloudfront.example.com/video9.mp4', 'https://example.com/subs9.srt', 49000000, 'test-mux-asset-9', 'test-playback-9', 'updated'),
  (1010, 'test-video-10', 'https://cloudfront.example.com/video10.mp4', 'https://example.com/subs10.srt', 53000000, 'test-mux-asset-10', 'test-playback-10', 'updated');

-- Seed lessons (linked to videos and courses)
INSERT INTO lessons (id, video_id, instructor_id, slug, state, course_id, title, body) VALUES
  (2001, 1001, 1, 'test-lesson-react-hooks', 'published', 100, 'Introduction to React Hooks', 'Learn about useState and useEffect'),
  (2002, 1002, 1, 'test-lesson-react-context', 'published', 100, 'Using React Context', 'Master the Context API'),
  (2003, 1003, 1, 'test-lesson-react-suspense', 'published', 100, 'React Suspense Basics', 'Understand Suspense and lazy loading'),
  (2004, 1004, 1, 'test-lesson-react-performance', 'published', 100, 'React Performance Optimization', 'Learn about memo and useMemo'),
  (2005, 1005, 1, 'test-lesson-react-testing', 'published', 100, 'Testing React Components', 'Write tests with React Testing Library'),
  (2006, 1006, 2, 'test-lesson-ts-basics', 'published', 101, 'TypeScript Basics', 'Learn TypeScript fundamentals'),
  (2007, 1007, 2, 'test-lesson-ts-generics', 'published', 101, 'TypeScript Generics', 'Master generic types'),
  (2008, 1008, 2, 'test-lesson-ts-utility-types', 'published', 101, 'TypeScript Utility Types', 'Use built-in utility types'),
  (2009, 1009, 2, 'test-lesson-ts-advanced', 'published', 101, 'Advanced TypeScript Patterns', 'Advanced type patterns'),
  (2010, 1010, 2, 'test-lesson-ts-integration', 'published', 101, 'TypeScript with React', 'Combine TypeScript and React');
