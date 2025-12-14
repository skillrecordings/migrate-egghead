--
-- PostgreSQL database dump
--

-- (removed for compatibility)

-- Dumped from database version 13.20
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- (removed for compatibility)
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: instructors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instructors (
    id integer NOT NULL,
    first_name character varying(255),
    last_name character varying(255),
    profile_picture_url character varying(255),
    twitter character varying(255),
    website character varying(255),
    bio_short text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    avatar_file_name character varying(255),
    avatar_content_type character varying(255),
    avatar_file_size integer,
    avatar_updated_at timestamp without time zone,
    percentage numeric(3,2) DEFAULT 0.2,
    user_id integer,
    slug character varying(255),
    trained_by_instructor_id integer,
    slack_id character varying(255),
    state character varying,
    email character varying,
    gear_tracking_number character varying,
    contract_id text,
    avatar_processing boolean,
    slack_group_id character varying,
    skip_onboarding boolean,
    internal_note character varying
);


--
-- Name: instructors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.instructors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: instructors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.instructors_id_seq OWNED BY public.instructors.id;


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    title character varying(255),
    youtube_id character varying(255),
    summary text,
    duration integer,
    "position" integer,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    slug character varying(255),
    ascii text,
    wistia_id character varying(255),
    thumb_url text,
    published boolean DEFAULT false,
    embed_markup text,
    transcript text,
    wistia_embed_meta text,
    is_pro_content boolean DEFAULT false,
    aws_filename text,
    instructor_id integer,
    can_count_views boolean DEFAULT true,
    full_source_download boolean DEFAULT false,
    series_id integer,
    file_sizes text,
    display_id integer,
    rss_url text,
    title_url text,
    casting_words_order text,
    audio_url text,
    plays_count integer DEFAULT 0 NOT NULL,
    github_repo character varying(255),
    repo_tag character varying(255),
    jsbin_url character varying(255),
    codepen_id character varying(255),
    git_branch character varying(255),
    tweeted_on timestamp without time zone,
    state character varying(255),
    published_at timestamp without time zone,
    publish_at timestamp without time zone,
    row_order integer,
    github_user character varying(255),
    current_lesson_version_id integer,
    difficulty_rating integer DEFAULT 0,
    retired_at timestamp without time zone,
    series_row_order integer,
    assembly_id character varying(255),
    plunker_url text,
    creator_id integer,
    cached_tag_list character varying,
    cached_library_list character varying,
    cached_language_list character varying,
    cached_framework_list character varying,
    cached_tool_list character varying,
    cached_platform_list character varying,
    cached_skillset_list character varying,
    cached_skill_level_list character varying,
    gist_url text,
    popularity_order integer,
    srt text,
    free_forever boolean DEFAULT false,
    old_technology character varying,
    visibility_state character varying DEFAULT 'hidden'::character varying,
    square_cover_file_name character varying,
    square_cover_content_type character varying,
    square_cover_file_size integer,
    square_cover_updated_at timestamp without time zone,
    square_cover_processing boolean,
    site character varying DEFAULT 'egghead.io'::character varying,
    code_url text,
    notes text,
    resource_type character varying DEFAULT 'lesson'::character varying,
    guid character varying,
    current_video_dash_url character varying,
    current_video_hls_url character varying,
    staff_notes_url character varying,
    revenue_share_instructor_id integer
);


--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lessons_id_seq OWNED BY public.lessons.id;


--
-- Name: playlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.playlists (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    owner_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    slug character varying(255),
    featured boolean,
    published boolean DEFAULT true,
    is_complete boolean,
    published_at timestamp without time zone,
    tweeted_on timestamp without time zone,
    square_cover_file_name character varying,
    square_cover_content_type character varying,
    square_cover_file_size integer,
    square_cover_updated_at timestamp without time zone,
    tagline text,
    summary text,
    price double precision,
    revshare_percent numeric,
    site character varying DEFAULT 'egghead.io'::character varying,
    visibility_state character varying DEFAULT 'hidden'::character varying,
    square_cover_processing boolean,
    kvstore jsonb DEFAULT '{}'::jsonb,
    state character varying DEFAULT 'new'::character varying,
    row_order integer,
    code_url text,
    access_state text,
    guid character varying,
    queue_order integer,
    shared_id character varying
);


--
-- Name: playlists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.playlists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: playlists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.playlists_id_seq OWNED BY public.playlists.id;


--
-- Name: taggings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.taggings (
    id integer NOT NULL,
    tag_id integer,
    taggable_id integer,
    taggable_type character varying(255),
    tagger_id integer,
    tagger_type character varying(255),
    context character varying(128),
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: taggings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.taggings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: taggings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.taggings_id_seq OWNED BY public.taggings.id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tags (
    id integer NOT NULL,
    name character varying(255),
    taggings_count integer DEFAULT 0,
    image_file_name character varying,
    image_content_type character varying,
    image_file_size integer,
    image_updated_at timestamp without time zone,
    slug character varying,
    description text,
    url text,
    label character varying,
    popularity_order integer,
    updated_at timestamp without time zone,
    context character varying
);


--
-- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tags_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;


--
-- Name: tracklists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracklists (
    id integer NOT NULL,
    tracklistable_id integer NOT NULL,
    playlist_id integer NOT NULL,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    row_order integer,
    tracklistable_type character varying
);


--
-- Name: tracklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tracklists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tracklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tracklists_id_seq OWNED BY public.tracklists.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) DEFAULT ''::character varying NOT NULL,
    encrypted_password character varying(255) DEFAULT ''::character varying NOT NULL,
    reset_password_token character varying(255),
    reset_password_sent_at timestamp without time zone,
    remember_created_at timestamp without time zone,
    sign_in_count integer DEFAULT 0,
    current_sign_in_at timestamp without time zone,
    last_sign_in_at timestamp without time zone,
    current_sign_in_ip character varying(255),
    last_sign_in_ip character varying(255),
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    first_name character varying(255),
    last_name character varying(255),
    confirmation_token character varying(255),
    confirmed_at timestamp without time zone,
    confirmation_sent_at timestamp without time zone,
    unconfirmed_email character varying(255),
    avatar_url character varying(255),
    can_contact boolean DEFAULT true,
    managed_subscription_id integer,
    authentication_token character varying(255),
    favorite_playlist_id integer,
    provider character varying(255),
    uid character varying(255),
    has_random_password boolean,
    is_banned boolean DEFAULT false,
    avatar_file_name character varying(255),
    avatar_content_type character varying(255),
    avatar_file_size integer,
    avatar_updated_at timestamp without time zone,
    slack_id character varying,
    is_invited_to_slack boolean DEFAULT false,
    country character varying,
    city character varying,
    state character varying,
    trial_started_at timestamp without time zone,
    kvstore jsonb DEFAULT '{}'::jsonb,
    community_status character varying DEFAULT 'nonmember'::character varying,
    discord_id character varying
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: instructors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructors ALTER COLUMN id SET DEFAULT nextval('public.instructors_id_seq'::regclass);


--
-- Name: lessons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons ALTER COLUMN id SET DEFAULT nextval('public.lessons_id_seq'::regclass);


--
-- Name: playlists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists ALTER COLUMN id SET DEFAULT nextval('public.playlists_id_seq'::regclass);


--
-- Name: taggings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taggings ALTER COLUMN id SET DEFAULT nextval('public.taggings_id_seq'::regclass);


--
-- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);


--
-- Name: tracklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracklists ALTER COLUMN id SET DEFAULT nextval('public.tracklists_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: instructors instructors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instructors
    ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: playlists playlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT playlists_pkey PRIMARY KEY (id);


--
-- Name: taggings taggings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.taggings
    ADD CONSTRAINT taggings_pkey PRIMARY KEY (id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: tracklists tracklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracklists
    ADD CONSTRAINT tracklists_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_lessons_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lessons_created_at ON public.lessons USING btree (created_at);


--
-- Name: idx_taggings_on_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_taggings_on_created_at ON public.taggings USING btree (created_at);


--
-- Name: index_instructors_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_instructors_on_email ON public.instructors USING btree (email);


--
-- Name: index_instructors_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_instructors_on_slug ON public.instructors USING btree (slug);


--
-- Name: index_instructors_on_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_instructors_on_user_id ON public.instructors USING btree (user_id);


--
-- Name: index_lessons_on_creator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_creator_id ON public.lessons USING btree (creator_id);


--
-- Name: index_lessons_on_instructor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_instructor_id ON public.lessons USING btree (instructor_id);


--
-- Name: index_lessons_on_popularity_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_popularity_order ON public.lessons USING btree (popularity_order);


--
-- Name: index_lessons_on_revenue_share_instructor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_revenue_share_instructor_id ON public.lessons USING btree (revenue_share_instructor_id);


--
-- Name: index_lessons_on_series_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_series_id ON public.lessons USING btree (series_id);


--
-- Name: index_lessons_on_series_id_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_series_id_state ON public.lessons USING btree (series_id, state);


--
-- Name: index_lessons_on_site; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_site ON public.lessons USING btree (site);


--
-- Name: index_lessons_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_slug ON public.lessons USING btree (slug);


--
-- Name: index_lessons_on_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_updated_at ON public.lessons USING btree (updated_at);


--
-- Name: index_lessons_on_visibility_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_lessons_on_visibility_state ON public.lessons USING btree (visibility_state) WHERE ((visibility_state)::text = 'indexed'::text);


--
-- Name: index_playlists_on_kvstore; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_playlists_on_kvstore ON public.playlists USING gin (kvstore);


--
-- Name: index_playlists_on_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_playlists_on_owner_id ON public.playlists USING btree (owner_id);


--
-- Name: index_playlists_on_site; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_playlists_on_site ON public.playlists USING btree (site);


--
-- Name: index_playlists_on_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_playlists_on_slug ON public.playlists USING btree (slug);


--
-- Name: index_taggings_on_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_context ON public.taggings USING btree (context);


--
-- Name: index_taggings_on_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_tag_id ON public.taggings USING btree (tag_id);


--
-- Name: index_taggings_on_taggable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_taggable_id ON public.taggings USING btree (taggable_id);


--
-- Name: index_taggings_on_taggable_id_and_taggable_type_and_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_taggable_id_and_taggable_type_and_context ON public.taggings USING btree (taggable_id, taggable_type, context);


--
-- Name: index_taggings_on_taggable_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_taggable_type ON public.taggings USING btree (taggable_type);


--
-- Name: index_taggings_on_tagger_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_tagger_id ON public.taggings USING btree (tagger_id);


--
-- Name: index_taggings_on_tagger_id_and_tagger_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_taggings_on_tagger_id_and_tagger_type ON public.taggings USING btree (tagger_id, tagger_type);


--
-- Name: index_tags_on_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tags_on_context ON public.tags USING btree (context);


--
-- Name: index_tags_on_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_tags_on_name ON public.tags USING btree (name);


--
-- Name: index_tags_on_popularity_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tags_on_popularity_order ON public.tags USING btree (popularity_order);


--
-- Name: index_tracklists_on_playlist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tracklists_on_playlist_id ON public.tracklists USING btree (playlist_id);


--
-- Name: index_tracklists_on_tracklistable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tracklists_on_tracklistable_id ON public.tracklists USING btree (tracklistable_id);


--
-- Name: index_tracklists_on_tracklistable_type_and_tracklistable_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_tracklists_on_tracklistable_type_and_tracklistable_id ON public.tracklists USING btree (tracklistable_type, tracklistable_id);


--
-- Name: index_users_on_authentication_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_authentication_token ON public.users USING btree (authentication_token);


--
-- Name: index_users_on_confirmation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_confirmation_token ON public.users USING btree (confirmation_token);


--
-- Name: index_users_on_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_email ON public.users USING btree (email);


--
-- Name: index_users_on_favorite_playlist_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_favorite_playlist_id ON public.users USING btree (favorite_playlist_id);


--
-- Name: index_users_on_kvstore; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_kvstore ON public.users USING gin (kvstore);


--
-- Name: index_users_on_lower_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_lower_email_id ON public.users USING btree (lower((email)::text), id);


--
-- Name: index_users_on_managed_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_users_on_managed_subscription_id ON public.users USING btree (managed_subscription_id);


--
-- Name: index_users_on_reset_password_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX index_users_on_reset_password_token ON public.users USING btree (reset_password_token);


--
-- Name: taggings_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX taggings_idx ON public.taggings USING btree (tag_id, taggable_id, taggable_type, context, tagger_id, tagger_type);


--
-- Name: taggings_idy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX taggings_idy ON public.taggings USING btree (taggable_id, taggable_type, tagger_id, context);


--
-- Name: playlists fk_rails_53741b10fc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.playlists
    ADD CONSTRAINT fk_rails_53741b10fc FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: lessons fk_rails_5e4fbd8e41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_rails_5e4fbd8e41 FOREIGN KEY (creator_id) REFERENCES public.users(id);


--
-- Name: lessons fk_rails_dcecc98c13; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT fk_rails_dcecc98c13 FOREIGN KEY (revenue_share_instructor_id) REFERENCES public.instructors(id);


--
-- PostgreSQL database dump complete
--

-- (removed for compatibility)

