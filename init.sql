CREATE DATABASE velog
  LC_COLLATE 'C'
  LC_CTYPE 'C'
  ENCODING 'UTF8'
  TEMPLATE template0;

CREATE USER velog WITH ENCRYPTED PASSWORD 'velogpw';
GRANT ALL PRIVILEGES ON DATABASE velog to velog;

\c velog

--
-- PostgreSQL database dump
--

-- Dumped from database version 11.5
-- Dumped by pg_dump version 11.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_users OWNER TO velog;

--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.auth_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    disabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.auth_tokens OWNER TO velog;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255),
    url_slug character varying(255),
    "order" integer,
    parent character varying(255),
    fk_user_id uuid,
    private boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO velog;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_user_id uuid,
    text text,
    likes integer DEFAULT 0,
    meta_json text,
    reply_to uuid,
    level integer DEFAULT 0,
    has_replies boolean DEFAULT false,
    deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.comments OWNER TO velog;

--
-- Name: email_auth; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.email_auth (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(255),
    email character varying(255),
    logged boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_auth OWNER TO velog;

--
-- Name: email_cert; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.email_cert (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(255),
    fk_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status boolean DEFAULT true
);


ALTER TABLE public.email_cert OWNER TO velog;

--
-- Name: feeds; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.feeds (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_user_id uuid,
    reason jsonb,
    score integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.feeds OWNER TO velog;

--
-- Name: follow_tag; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.follow_tag (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    fk_tag_id uuid,
    score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follow_tag OWNER TO velog;

--
-- Name: follow_user; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.follow_user (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    fk_follow_user_id uuid,
    score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.follow_user OWNER TO velog;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO velog;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: velog
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO velog;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: velog
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: post_histories; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_histories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    title character varying(255),
    body text,
    is_release boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_markdown boolean DEFAULT false NOT NULL
);


ALTER TABLE public.post_histories OWNER TO velog;

--
-- Name: post_images; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_user_id uuid,
    path character varying(255),
    filesize integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_images OWNER TO velog;

--
-- Name: post_likes; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_likes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_likes OWNER TO velog;

--
-- Name: post_reads; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_reads (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    ip_hash character varying(255),
    fk_user_id uuid,
    fk_post_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_reads OWNER TO velog;

--
-- Name: post_scores; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_scores (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type character varying(255),
    fk_user_id uuid,
    fk_post_id uuid,
    score double precision DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.post_scores OWNER TO velog;

--
-- Name: post_tags; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.post_tags (
    fk_post_id uuid NOT NULL,
    fk_tag_id uuid NOT NULL
);


ALTER TABLE public.post_tags OWNER TO velog;

--
-- Name: posts; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.posts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying(255),
    body text,
    short_description character varying(255),
    thumbnail character varying(255),
    is_markdown boolean,
    is_temp boolean,
    fk_user_id uuid,
    original_post_id uuid,
    url_slug character varying(255),
    likes integer DEFAULT 0,
    meta jsonb DEFAULT '{}'::jsonb,
    views integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_private boolean DEFAULT false NOT NULL,
    released_at timestamp with time zone DEFAULT now(),
    tsv tsvector
);


ALTER TABLE public.posts OWNER TO velog;

--
-- Name: posts_categories; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.posts_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_category_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.posts_categories OWNER TO velog;

--
-- Name: posts_tags; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.posts_tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_tag_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.posts_tags OWNER TO velog;

--
-- Name: series; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.series (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    name character varying(255),
    description text,
    thumbnail character varying(255),
    url_slug character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.series OWNER TO velog;

--
-- Name: series_posts; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.series_posts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_series_id uuid,
    fk_post_id uuid,
    index integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.series_posts OWNER TO velog;

--
-- Name: social_accounts; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.social_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    social_id character varying(255),
    access_token character varying(255),
    provider character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fk_user_id uuid
);


ALTER TABLE public.social_accounts OWNER TO velog;

--
-- Name: tag_alias; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.tag_alias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_tag_id uuid NOT NULL,
    fk_alias_tag_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tag_alias OWNER TO velog;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description character varying(255),
    thumbnail character varying(255),
    name_filtered character varying(255),
    is_alias boolean DEFAULT false NOT NULL
);


ALTER TABLE public.tags OWNER TO velog;

--
-- Name: url_slug_histories; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.url_slug_histories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_post_id uuid,
    fk_user_id uuid,
    url_slug character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.url_slug_histories OWNER TO velog;

--
-- Name: user_images; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.user_images (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    path character varying(255),
    filesize integer,
    type character varying(255),
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_images OWNER TO velog;

--
-- Name: user_meta; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.user_meta (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    email_notification boolean DEFAULT false,
    email_promotion boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_meta OWNER TO velog;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    display_name character varying(255),
    short_bio character varying(255),
    thumbnail character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    fk_user_id uuid,
    profile_links jsonb DEFAULT '{}'::jsonb NOT NULL,
    about text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.user_profiles OWNER TO velog;

--
-- Name: user_thumbnails; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.user_thumbnails (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    fk_user_id uuid,
    path character varying(255),
    filesize integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_thumbnails OWNER TO velog;

--
-- Name: users; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(255),
    email character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_certified boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO velog;

--
-- Name: velog_configs; Type: TABLE; Schema: public; Owner: velog
--

CREATE TABLE public.velog_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    title character varying(255),
    logo_image character varying(255),
    fk_user_id uuid NOT NULL
);


ALTER TABLE public.velog_configs OWNER TO velog;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: admin_users PK_06744d221bb6145dc61e5dc441d; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY (id);


--
-- Name: post_tags PK_0734929674029206aa2b8b4554a; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT "PK_0734929674029206aa2b8b4554a" PRIMARY KEY (fk_post_id, fk_tag_id);


--
-- Name: velog_configs PK_24f36353fb78d23293b7a3f15df; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.velog_configs
    ADD CONSTRAINT "PK_24f36353fb78d23293b7a3f15df" PRIMARY KEY (id);


--
-- Name: auth_tokens PK_41e9ddfbb32da18c4e85e45c2fd; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: tag_alias PK_8eddc983e5df66c0c2644e33152; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.tag_alias
    ADD CONSTRAINT "PK_8eddc983e5df66c0c2644e33152" PRIMARY KEY (id);


--
-- Name: velog_configs REL_8b5be783e08f563452ec0c489e; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.velog_configs
    ADD CONSTRAINT "REL_8b5be783e08f563452ec0c489e" UNIQUE (fk_user_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: email_auth email_auth_code_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.email_auth
    ADD CONSTRAINT email_auth_code_key UNIQUE (code);


--
-- Name: email_auth email_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.email_auth
    ADD CONSTRAINT email_auth_pkey PRIMARY KEY (id);


--
-- Name: email_cert email_cert_code_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.email_cert
    ADD CONSTRAINT email_cert_code_key UNIQUE (code);


--
-- Name: email_cert email_cert_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.email_cert
    ADD CONSTRAINT email_cert_pkey PRIMARY KEY (id);


--
-- Name: feeds feeds_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_pkey PRIMARY KEY (id);


--
-- Name: follow_tag follow_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_tag
    ADD CONSTRAINT follow_tag_pkey PRIMARY KEY (id);


--
-- Name: follow_user follow_user_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_user
    ADD CONSTRAINT follow_user_pkey PRIMARY KEY (id);


--
-- Name: post_histories post_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_histories
    ADD CONSTRAINT post_histories_pkey PRIMARY KEY (id);


--
-- Name: post_images post_images_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_pkey PRIMARY KEY (id);


--
-- Name: post_likes post_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_pkey PRIMARY KEY (id);


--
-- Name: post_reads post_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_reads
    ADD CONSTRAINT post_reads_pkey PRIMARY KEY (id);


--
-- Name: post_scores post_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_scores
    ADD CONSTRAINT post_scores_pkey PRIMARY KEY (id);


--
-- Name: posts_categories posts_categories_fk_post_id_fk_category_id_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_categories
    ADD CONSTRAINT posts_categories_fk_post_id_fk_category_id_key UNIQUE (fk_post_id, fk_category_id);


--
-- Name: posts_categories posts_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_categories
    ADD CONSTRAINT posts_categories_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: posts_tags posts_tags_fk_post_id_fk_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_fk_post_id_fk_tag_id_key UNIQUE (fk_post_id, fk_tag_id);


--
-- Name: posts_tags posts_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_pkey PRIMARY KEY (id);


--
-- Name: series series_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.series
    ADD CONSTRAINT series_pkey PRIMARY KEY (id);


--
-- Name: series_posts series_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.series_posts
    ADD CONSTRAINT series_posts_pkey PRIMARY KEY (id);


--
-- Name: social_accounts social_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_pkey PRIMARY KEY (id);


--
-- Name: tags tags_name_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: url_slug_histories url_slug_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.url_slug_histories
    ADD CONSTRAINT url_slug_histories_pkey PRIMARY KEY (id);


--
-- Name: user_images user_images_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_pkey PRIMARY KEY (id);


--
-- Name: user_meta user_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_meta
    ADD CONSTRAINT user_meta_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_thumbnails user_thumbnails_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_thumbnails
    ADD CONSTRAINT user_thumbnails_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_38921256eca6f24170411db8ac; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX "IDX_38921256eca6f24170411db8ac" ON public.tag_alias USING btree (fk_tag_id);


--
-- Name: IDX_3d4d13db047f2b2ca7671b8403; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX "IDX_3d4d13db047f2b2ca7671b8403" ON public.post_tags USING btree (fk_post_id);


--
-- Name: IDX_4de7a827965a085c53d7983f48; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX "IDX_4de7a827965a085c53d7983f48" ON public.post_tags USING btree (fk_tag_id);


--
-- Name: IDX_548ae43e47192962c941abbc4d; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX "IDX_548ae43e47192962c941abbc4d" ON public.admin_users USING btree (fk_user_id);


--
-- Name: IDX_7b79c9ec6899a16e12374462df; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX "IDX_7b79c9ec6899a16e12374462df" ON public.tag_alias USING btree (fk_alias_tag_id);


--
-- Name: categories_url_slug; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX categories_url_slug ON public.categories USING btree (url_slug);


--
-- Name: category_order_of_user; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX category_order_of_user ON public.categories USING btree (fk_user_id, parent, "order");


--
-- Name: comments_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX comments_created_at ON public.comments USING btree (created_at);


--
-- Name: email_cert_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX email_cert_fk_user_id ON public.email_cert USING btree (fk_user_id);


--
-- Name: feeds_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX feeds_created_at ON public.feeds USING btree (created_at);


--
-- Name: post_histories_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_histories_created_at ON public.post_histories USING btree (created_at);


--
-- Name: post_histories_fk_post_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_histories_fk_post_id ON public.post_histories USING btree (fk_post_id);


--
-- Name: post_likes_fk_post_id_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE UNIQUE INDEX post_likes_fk_post_id_fk_user_id ON public.post_likes USING btree (fk_post_id, fk_user_id);
CREATE INDEX post_likes_created_at ON public.post_likes USING btree (created_at);
CREATE INDEX post_likes_fk_user_id ON public.post_likes USING btree (fk_user_id);

--
-- Name: post_reads_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_reads_created_at ON public.post_reads USING btree (created_at);


--
-- Name: post_reads_ip_hash_fk_post_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_reads_ip_hash_fk_post_id ON public.post_reads USING btree (ip_hash, fk_post_id);


--
-- Name: post_scores_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_scores_created_at ON public.post_scores USING btree (created_at);


--
-- Name: post_scores_fk_post_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_scores_fk_post_id ON public.post_scores USING btree (fk_post_id);


--
-- Name: post_scores_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX post_scores_fk_user_id ON public.post_scores USING btree (fk_user_id);


--
-- Name: posts_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_created_at ON public.posts USING btree (created_at);


--
-- Name: posts_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_fk_user_id ON public.posts USING btree (fk_user_id);


--
-- Name: posts_is_private; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_is_private ON public.posts USING btree (is_private);


--
-- Name: posts_is_temp; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_is_temp ON public.posts USING btree (is_temp);


--
-- Name: posts_released_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_released_at ON public.posts USING btree (released_at);


--
-- Name: posts_tsv; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_tsv ON public.posts USING gin (tsv);


--
-- Name: posts_url_slug; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX posts_url_slug ON public.posts USING btree (url_slug);


--
-- Name: series_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_created_at ON public.series USING btree (created_at);


--
-- Name: series_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_fk_user_id ON public.series USING btree (fk_user_id);


--
-- Name: series_fk_user_id_url_slug; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_fk_user_id_url_slug ON public.series USING btree (fk_user_id, url_slug);


--
-- Name: series_posts_fk_post_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_posts_fk_post_id ON public.series_posts USING btree (fk_post_id);


--
-- Name: series_posts_fk_series_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_posts_fk_series_id ON public.series_posts USING btree (fk_series_id);


--
-- Name: series_updated_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX series_updated_at ON public.series USING btree (updated_at);


--
-- Name: social_accounts_provider_social_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX social_accounts_provider_social_id ON public.social_accounts USING btree (provider, social_id);


--
-- Name: tags_is_alias; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX tags_is_alias ON public.tags USING btree (is_alias);


--
-- Name: tags_name_filtered; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX tags_name_filtered ON public.tags USING btree (name_filtered);


--
-- Name: url_slug_histories_created_at; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX url_slug_histories_created_at ON public.url_slug_histories USING btree (created_at);


--
-- Name: url_slug_histories_url_slug; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX url_slug_histories_url_slug ON public.url_slug_histories USING btree (url_slug);


--
-- Name: user_images_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX user_images_fk_user_id ON public.user_images USING btree (fk_user_id);


--
-- Name: user_images_ref_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX user_images_ref_id ON public.user_images USING btree (ref_id);


--
-- Name: user_images_type; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX user_images_type ON public.user_images USING btree (type);


--
-- Name: user_meta_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX user_meta_fk_user_id ON public.user_meta USING btree (fk_user_id);


--
-- Name: user_profiles_fk_user_id; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX user_profiles_fk_user_id ON public.user_profiles USING btree (fk_user_id);


--
-- Name: users_email; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX users_email ON public.users USING btree (email);


--
-- Name: users_username; Type: INDEX; Schema: public; Owner: velog
--

CREATE INDEX users_username ON public.users USING btree (username);


--
-- Name: tag_alias FK_38921256eca6f24170411db8ac7; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.tag_alias
    ADD CONSTRAINT "FK_38921256eca6f24170411db8ac7" FOREIGN KEY (fk_tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: post_tags FK_3d4d13db047f2b2ca7671b84034; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT "FK_3d4d13db047f2b2ca7671b84034" FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: post_tags FK_4de7a827965a085c53d7983f480; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_tags
    ADD CONSTRAINT "FK_4de7a827965a085c53d7983f480" FOREIGN KEY (fk_tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: admin_users FK_548ae43e47192962c941abbc4d1; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT "FK_548ae43e47192962c941abbc4d1" FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: auth_tokens FK_71e1bb3fd8c767a404b1a6a211e; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT "FK_71e1bb3fd8c767a404b1a6a211e" FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_alias FK_7b79c9ec6899a16e12374462dfc; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.tag_alias
    ADD CONSTRAINT "FK_7b79c9ec6899a16e12374462dfc" FOREIGN KEY (fk_alias_tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: velog_configs FK_8b5be783e08f563452ec0c489e1; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.velog_configs
    ADD CONSTRAINT "FK_8b5be783e08f563452ec0c489e1" FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: comments comments_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: comments comments_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: email_cert email_cert_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.email_cert
    ADD CONSTRAINT email_cert_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: feeds feeds_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: feeds feeds_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.feeds
    ADD CONSTRAINT feeds_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: follow_tag follow_tag_fk_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_tag
    ADD CONSTRAINT follow_tag_fk_tag_id_fkey FOREIGN KEY (fk_tag_id) REFERENCES public.tags(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: follow_tag follow_tag_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_tag
    ADD CONSTRAINT follow_tag_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: follow_user follow_user_fk_follow_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_user
    ADD CONSTRAINT follow_user_fk_follow_user_id_fkey FOREIGN KEY (fk_follow_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: follow_user follow_user_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.follow_user
    ADD CONSTRAINT follow_user_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_histories post_histories_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_histories
    ADD CONSTRAINT post_histories_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_images post_images_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_images post_images_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_images
    ADD CONSTRAINT post_images_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_likes post_likes_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_likes post_likes_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_likes
    ADD CONSTRAINT post_likes_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_reads post_reads_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_reads
    ADD CONSTRAINT post_reads_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_reads post_reads_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_reads
    ADD CONSTRAINT post_reads_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_scores post_scores_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_scores
    ADD CONSTRAINT post_scores_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: post_scores post_scores_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.post_scores
    ADD CONSTRAINT post_scores_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: posts_categories posts_categories_fk_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_categories
    ADD CONSTRAINT posts_categories_fk_category_id_fkey FOREIGN KEY (fk_category_id) REFERENCES public.categories(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: posts_categories posts_categories_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_categories
    ADD CONSTRAINT posts_categories_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: posts posts_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: posts_tags posts_tags_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: posts_tags posts_tags_fk_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.posts_tags
    ADD CONSTRAINT posts_tags_fk_tag_id_fkey FOREIGN KEY (fk_tag_id) REFERENCES public.tags(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: series series_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.series
    ADD CONSTRAINT series_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: series_posts series_posts_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.series_posts
    ADD CONSTRAINT series_posts_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: series_posts series_posts_fk_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.series_posts
    ADD CONSTRAINT series_posts_fk_series_id_fkey FOREIGN KEY (fk_series_id) REFERENCES public.series(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: social_accounts social_accounts_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: url_slug_histories url_slug_histories_fk_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.url_slug_histories
    ADD CONSTRAINT url_slug_histories_fk_post_id_fkey FOREIGN KEY (fk_post_id) REFERENCES public.posts(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: url_slug_histories url_slug_histories_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.url_slug_histories
    ADD CONSTRAINT url_slug_histories_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: user_images user_images_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: user_meta user_meta_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_meta
    ADD CONSTRAINT user_meta_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_thumbnails user_thumbnails_fk_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: velog
--

ALTER TABLE ONLY public.user_thumbnails
    ADD CONSTRAINT user_thumbnails_fk_user_id_fkey FOREIGN KEY (fk_user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

CREATE TABLE public.post_read_logs (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	fk_post_id uuid NOT NULL,
	fk_user_id uuid NOT NULL,
	percentage float4 NOT NULL,
	resume_title_id varchar(255) NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "PK_bc18dad4a9c6ab3bf5a8605f9e7" PRIMARY KEY (id),
	CONSTRAINT "FK_7b37d3334ab7d049a97f8b2ee0c" FOREIGN KEY (fk_post_id) REFERENCES posts(id) ON DELETE CASCADE,
	CONSTRAINT "FK_d4fd1d180f05445287d377ba49c" FOREIGN KEY (fk_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX "IDX_7b37d3334ab7d049a97f8b2ee0" ON public.post_read_logs USING btree (fk_post_id);
CREATE INDEX "IDX_d4fd1d180f05445287d377ba49" ON public.post_read_logs USING btree (fk_user_id);

ALTER TABLE public.post_read_logs OWNER TO velog;