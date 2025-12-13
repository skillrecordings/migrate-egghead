-- PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE DEFAULT '',
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar_url VARCHAR(255),
  authentication_token VARCHAR(255) UNIQUE,
  encrypted_password VARCHAR(255) NOT NULL DEFAULT '',
  sign_in_count INTEGER DEFAULT 0,
  current_sign_in_at TIMESTAMP,
  last_sign_in_at TIMESTAMP,
  current_sign_in_ip VARCHAR(255),
  last_sign_in_ip VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  confirmation_token VARCHAR(255) UNIQUE,
  confirmed_at TIMESTAMP,
  confirmation_sent_at TIMESTAMP,
  unconfirmed_email VARCHAR(255),
  reset_password_token VARCHAR(255) UNIQUE,
  reset_password_sent_at TIMESTAMP,
  remember_created_at TIMESTAMP,
  state VARCHAR(255),
  provider VARCHAR(255),
  uid VARCHAR(255),
  can_contact BOOLEAN DEFAULT true,
  has_random_password BOOLEAN,
  is_banned BOOLEAN DEFAULT false,
  is_invited_to_slack BOOLEAN DEFAULT false,
  slack_id VARCHAR(255),
  discord_id VARCHAR(255),
  city VARCHAR(255),
  country VARCHAR(255),
  community_status VARCHAR(255) DEFAULT 'nonmember',
  trial_started_at TIMESTAMP,
  managed_subscription_id INTEGER,
  favorite_playlist_id INTEGER,
  kvstore JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_on_email ON users(email);
CREATE INDEX idx_users_on_authentication_token ON users(authentication_token);
CREATE INDEX idx_users_on_kvstore ON users USING gin(kvstore);

-- Instructors table
CREATE TABLE instructors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  avatar_file_name VARCHAR(255),
  avatar_content_type VARCHAR(255),
  avatar_file_size INTEGER,
  avatar_updated_at TIMESTAMP,
  avatar_processing BOOLEAN,
  profile_picture_url VARCHAR(255),
  bio_short TEXT,
  twitter VARCHAR(255),
  website VARCHAR(255),
  state VARCHAR(255),
  percentage DECIMAL(3,2) DEFAULT 0.2,
  slack_id VARCHAR(255),
  slack_group_id VARCHAR(255),
  gear_tracking_number VARCHAR(255),
  internal_note VARCHAR(255),
  skip_onboarding BOOLEAN,
  trained_by_instructor_id INTEGER,
  contract_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instructors_on_user_id ON instructors(user_id);
CREATE INDEX idx_instructors_on_email ON instructors(email);
CREATE INDEX idx_instructors_on_slug ON instructors(slug);

-- Series table (courses)
CREATE TABLE series (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  summary TEXT,
  tagline TEXT,
  instructor_id INTEGER,
  state VARCHAR(255),
  visibility_state VARCHAR(255) DEFAULT 'hidden',
  site VARCHAR(255) DEFAULT 'egghead.io',
  published_at TIMESTAMP,
  publish_at TIMESTAMP,
  publish_subject VARCHAR(255),
  publish_body TEXT,
  free_forever BOOLEAN DEFAULT false,
  is_complete BOOLEAN DEFAULT false,
  price FLOAT,
  purchase_price DECIMAL,
  revshare_percent FLOAT,
  repo VARCHAR(255),
  queue_order INTEGER,
  row_order INTEGER,
  square_cover_file_name VARCHAR(255),
  square_cover_content_type VARCHAR(255),
  square_cover_file_size INTEGER,
  square_cover_updated_at TIMESTAMP,
  square_cover_processing BOOLEAN,
  tweeted_on TIMESTAMP,
  kvstore JSONB DEFAULT '{}',
  resources_id BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_series_on_instructor_id ON series(instructor_id);
CREATE INDEX idx_series_on_slug ON series(slug);
CREATE INDEX idx_series_on_visibility_state ON series(visibility_state) WHERE visibility_state = 'indexed';
CREATE INDEX idx_series_on_kvstore ON series USING gin(kvstore);
CREATE INDEX idx_series_on_row_order ON series(row_order);

-- Lessons table
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  slug VARCHAR(255),
  summary TEXT,
  description TEXT,
  duration INTEGER,
  state VARCHAR(255),
  visibility_state VARCHAR(255) DEFAULT 'hidden',
  site VARCHAR(255) DEFAULT 'egghead.io',
  instructor_id INTEGER,
  series_id INTEGER,
  creator_id INTEGER,
  revenue_share_instructor_id INTEGER,
  current_lesson_version_id INTEGER,
  current_video_hls_url VARCHAR(255),
  current_video_dash_url VARCHAR(255),
  display_id INTEGER,
  guid VARCHAR(255),
  resource_type VARCHAR(255) DEFAULT 'lesson',
  position INTEGER,
  row_order INTEGER,
  series_row_order INTEGER,
  popularity_order INTEGER,
  difficulty_rating INTEGER DEFAULT 0,
  plays_count INTEGER DEFAULT 0 NOT NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  publish_at TIMESTAMP,
  retired_at TIMESTAMP,
  free_forever BOOLEAN DEFAULT false,
  is_pro_content BOOLEAN DEFAULT false,
  can_count_views BOOLEAN DEFAULT true,
  full_source_download BOOLEAN DEFAULT false,
  wistia_id VARCHAR(255),
  youtube_id VARCHAR(255),
  assembly_id VARCHAR(255),
  aws_filename TEXT,
  audio_url TEXT,
  thumb_url TEXT,
  title_url TEXT,
  code_url TEXT,
  embed_markup TEXT,
  file_sizes TEXT,
  rss_url TEXT,
  srt TEXT,
  transcript TEXT,
  notes TEXT,
  ascii TEXT,
  gist_url TEXT,
  plunker_url TEXT,
  jsbin_url VARCHAR(255),
  github_user VARCHAR(255),
  github_repo VARCHAR(255),
  git_branch VARCHAR(255),
  repo_tag VARCHAR(255),
  codepen_id VARCHAR(255),
  old_technology VARCHAR(255),
  casting_words_order TEXT,
  staff_notes_url VARCHAR(255),
  wistia_embed_meta TEXT,
  square_cover_file_name VARCHAR(255),
  square_cover_content_type VARCHAR(255),
  square_cover_file_size INTEGER,
  square_cover_updated_at TIMESTAMP,
  square_cover_processing BOOLEAN,
  tweeted_on TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_on_instructor_id ON lessons(instructor_id);
CREATE INDEX idx_lessons_on_series_id ON lessons(series_id);
CREATE INDEX idx_lessons_on_creator_id ON lessons(creator_id);
CREATE INDEX idx_lessons_on_revenue_share_instructor_id ON lessons(revenue_share_instructor_id);
CREATE INDEX idx_lessons_on_slug ON lessons(slug);
CREATE INDEX idx_lessons_on_site ON lessons(site);
CREATE INDEX idx_lessons_on_popularity_order ON lessons(popularity_order);
CREATE INDEX idx_lessons_on_visibility_state ON lessons(visibility_state) WHERE visibility_state = 'indexed';
CREATE INDEX idx_lessons_created_at ON lessons(created_at);

-- Playlists table
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  summary TEXT,
  tagline TEXT,
  owner_id INTEGER NOT NULL,
  access_state TEXT,
  state VARCHAR(255) DEFAULT 'new',
  visibility_state VARCHAR(255) DEFAULT 'hidden',
  site VARCHAR(255) DEFAULT 'egghead.io',
  published BOOLEAN DEFAULT true,
  published_at TIMESTAMP,
  featured BOOLEAN,
  is_complete BOOLEAN,
  price FLOAT,
  revshare_percent DECIMAL,
  queue_order INTEGER,
  row_order INTEGER,
  shared_id VARCHAR(255),
  guid VARCHAR(255),
  code_url TEXT,
  square_cover_file_name VARCHAR(255),
  square_cover_content_type VARCHAR(255),
  square_cover_file_size INTEGER,
  square_cover_updated_at TIMESTAMP,
  square_cover_processing BOOLEAN,
  tweeted_on TIMESTAMP,
  kvstore JSONB DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playlists_on_owner_id ON playlists(owner_id);
CREATE INDEX idx_playlists_on_slug ON playlists(slug);
CREATE INDEX idx_playlists_on_site ON playlists(site);
CREATE INDEX idx_playlists_on_kvstore ON playlists USING gin(kvstore);

-- Tracklists table (join table for playlists and lessons)
CREATE TABLE tracklists (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL,
  tracklistable_id INTEGER NOT NULL,
  tracklistable_type VARCHAR(255),
  row_order INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracklists_on_playlist_id ON tracklists(playlist_id);
CREATE INDEX idx_tracklists_on_tracklistable_id ON tracklists(tracklistable_id);
CREATE INDEX idx_tracklists_on_tracklistable_type_and_id ON tracklists(tracklistable_type, tracklistable_id);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE,
  slug VARCHAR(255),
  label VARCHAR(255),
  description TEXT,
  url TEXT,
  context VARCHAR(255),
  taggings_count INTEGER DEFAULT 0,
  popularity_order INTEGER,
  image_file_name VARCHAR(255),
  image_content_type VARCHAR(255),
  image_file_size INTEGER,
  image_updated_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_tags_on_name ON tags(name);
CREATE INDEX idx_tags_on_context ON tags(context);
CREATE INDEX idx_tags_on_popularity_order ON tags(popularity_order);

-- Taggings table (polymorphic join table)
CREATE TABLE taggings (
  id SERIAL PRIMARY KEY,
  tag_id INTEGER,
  taggable_id INTEGER,
  taggable_type VARCHAR(255),
  tagger_id INTEGER,
  tagger_type VARCHAR(255),
  context VARCHAR(128),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_taggings_unique ON taggings(tag_id, taggable_id, taggable_type, context, tagger_id, tagger_type);
CREATE INDEX idx_taggings_on_created_at ON taggings(created_at);

-- Foreign key constraints
ALTER TABLE instructors ADD CONSTRAINT fk_instructors_user_id FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE series ADD CONSTRAINT fk_series_instructor_id FOREIGN KEY (instructor_id) REFERENCES instructors(id);
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_instructor_id FOREIGN KEY (instructor_id) REFERENCES instructors(id);
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_series_id FOREIGN KEY (series_id) REFERENCES series(id);
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_creator_id FOREIGN KEY (creator_id) REFERENCES users(id);
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_revenue_share_instructor_id FOREIGN KEY (revenue_share_instructor_id) REFERENCES instructors(id);
ALTER TABLE playlists ADD CONSTRAINT fk_playlists_owner_id FOREIGN KEY (owner_id) REFERENCES users(id);
ALTER TABLE tracklists ADD CONSTRAINT fk_tracklists_playlist_id FOREIGN KEY (playlist_id) REFERENCES playlists(id);
