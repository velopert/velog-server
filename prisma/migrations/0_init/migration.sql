CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255),
    "url_slug" VARCHAR(255),
    "order" INTEGER,
    "parent" VARCHAR(255),
    "fk_user_id" UUID,
    "private" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_user_id" UUID,
    "text" TEXT,
    "likes" INTEGER DEFAULT 0,
    "meta_json" TEXT,
    "reply_to" UUID,
    "level" INTEGER DEFAULT 0,
    "has_replies" BOOLEAN DEFAULT false,
    "deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_auth" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(255),
    "email" VARCHAR(255),
    "logged" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_cert" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(255),
    "fk_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" BOOLEAN DEFAULT true,

    CONSTRAINT "email_cert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feeds" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_user_id" UUID,
    "reason" JSONB,
    "score" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_tag" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "fk_tag_id" UUID,
    "score" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_user" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "fk_follow_user_id" UUID,
    "score" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_histories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "title" VARCHAR(255),
    "body" TEXT,
    "is_release" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_markdown" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "post_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_images" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_user_id" UUID,
    "path" VARCHAR(255),
    "filesize" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_read_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID NOT NULL,
    "fk_user_id" UUID NOT NULL,
    "percentage" REAL NOT NULL,
    "resume_title_id" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_bc18dad4a9c6ab3bf5a8605f9e7" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reads" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "ip_hash" VARCHAR(255),
    "fk_user_id" UUID,
    "fk_post_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_scores" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "type" VARCHAR(255),
    "fk_user_id" UUID,
    "fk_post_id" UUID,
    "score" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "fk_post_id" UUID NOT NULL,
    "fk_tag_id" UUID NOT NULL,

    CONSTRAINT "PK_0734929674029206aa2b8b4554a" PRIMARY KEY ("fk_post_id","fk_tag_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" VARCHAR(255),
    "body" TEXT,
    "short_description" VARCHAR(255),
    "thumbnail" VARCHAR(500),
    "is_markdown" BOOLEAN,
    "is_temp" BOOLEAN,
    "fk_user_id" UUID,
    "original_post_id" UUID,
    "url_slug" VARCHAR(255),
    "likes" INTEGER DEFAULT 0,
    "meta" JSONB DEFAULT '{}',
    "views" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "released_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_category_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts_tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_tag_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "name" VARCHAR(255),
    "description" TEXT,
    "thumbnail" VARCHAR(255),
    "url_slug" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_posts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_series_id" UUID,
    "fk_post_id" UUID,
    "index" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "social_id" VARCHAR(255),
    "access_token" VARCHAR(255),
    "provider" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_user_id" UUID,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_alias" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_tag_id" UUID NOT NULL,
    "fk_alias_tag_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PK_8eddc983e5df66c0c2644e33152" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" VARCHAR(255),
    "thumbnail" VARCHAR(255),
    "name_filtered" VARCHAR(255),
    "is_alias" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_slug_histories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_post_id" UUID,
    "fk_user_id" UUID,
    "url_slug" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_slug_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_images" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "path" VARCHAR(255),
    "filesize" INTEGER,
    "type" VARCHAR(255),
    "ref_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_images_cloudflare" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID NOT NULL,
    "filesize" INTEGER NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "ref_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result_id" VARCHAR(64) NOT NULL,
    "tracked" BOOLEAN NOT NULL,
    "filename" VARCHAR(255) NOT NULL,

    CONSTRAINT "PK_2895f99b8fa2dec81b3ac82c2e3" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_images_next" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID NOT NULL,
    "filesize" INTEGER NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "ref_id" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracked" BOOLEAN NOT NULL,
    "file_id" VARCHAR(255),
    "path" VARCHAR(512),

    CONSTRAINT "PK_a1b3395aa09fbb4233f15ae06eb" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_meta" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "email_notification" BOOLEAN DEFAULT false,
    "email_promotion" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "display_name" VARCHAR(255),
    "short_bio" VARCHAR(255),
    "thumbnail" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_user_id" UUID,
    "profile_links" JSONB NOT NULL DEFAULT '{}',
    "about" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_thumbnails" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "fk_user_id" UUID,
    "path" VARCHAR(255),
    "filesize" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_thumbnails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "username" VARCHAR(255),
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_certified" BOOLEAN DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "velog_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" VARCHAR(255),
    "logo_image" VARCHAR(255),
    "fk_user_id" UUID NOT NULL,

    CONSTRAINT "PK_24f36353fb78d23293b7a3f15df" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_548ae43e47192962c941abbc4d" ON "admin_users"("fk_user_id");

-- CreateIndex
CREATE INDEX "categories_url_slug" ON "categories"("url_slug");

-- CreateIndex
CREATE INDEX "category_order_of_user" ON "categories"("fk_user_id", "parent", "order");

-- CreateIndex
CREATE INDEX "comments_created_at" ON "comments"("created_at");

-- CreateIndex
CREATE INDEX "comments_deleted_idx" ON "comments"("deleted");

-- CreateIndex
CREATE INDEX "comments_fk_post_id_idx" ON "comments"("fk_post_id");

-- CreateIndex
CREATE INDEX "comments_fk_user_id_idx" ON "comments"("fk_user_id", "deleted");

-- CreateIndex
CREATE UNIQUE INDEX "email_auth_code_key" ON "email_auth"("code");

-- CreateIndex
CREATE UNIQUE INDEX "email_cert_code_key" ON "email_cert"("code");

-- CreateIndex
CREATE INDEX "email_cert_fk_user_id" ON "email_cert"("fk_user_id");

-- CreateIndex
CREATE INDEX "feeds_created_at" ON "feeds"("created_at");

-- CreateIndex
CREATE INDEX "post_histories_created_at" ON "post_histories"("created_at");

-- CreateIndex
CREATE INDEX "post_histories_fk_post_id" ON "post_histories"("fk_post_id");

-- CreateIndex
CREATE INDEX "post_likes_created_at" ON "post_likes"("created_at");

-- CreateIndex
CREATE INDEX "post_likes_fk_user_id" ON "post_likes"("fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_fk_post_id_fk_user_id" ON "post_likes"("fk_post_id", "fk_user_id");

-- CreateIndex
CREATE INDEX "IDX_7b37d3334ab7d049a97f8b2ee0" ON "post_read_logs"("fk_post_id");

-- CreateIndex
CREATE INDEX "IDX_b5a284ac996f5c21be43611214" ON "post_read_logs"("updated_at");

-- CreateIndex
CREATE INDEX "IDX_d4fd1d180f05445287d377ba49" ON "post_read_logs"("fk_user_id");

-- CreateIndex
CREATE INDEX "post_reads_created_at" ON "post_reads"("created_at");

-- CreateIndex
CREATE INDEX "post_reads_fk_post_id" ON "post_reads"("fk_post_id");

-- CreateIndex
CREATE INDEX "post_reads_fk_user_id" ON "post_reads"("fk_user_id");

-- CreateIndex
CREATE INDEX "post_reads_ip_hash_fk_post_id" ON "post_reads"("ip_hash", "fk_post_id");

-- CreateIndex
CREATE INDEX "post_scores_created_at" ON "post_scores"("created_at");

-- CreateIndex
CREATE INDEX "post_scores_fk_post_id" ON "post_scores"("fk_post_id");

-- CreateIndex
CREATE INDEX "post_scores_fk_user_id" ON "post_scores"("fk_user_id");

-- CreateIndex
CREATE INDEX "IDX_3d4d13db047f2b2ca7671b8403" ON "post_tags"("fk_post_id");

-- CreateIndex
CREATE INDEX "IDX_4de7a827965a085c53d7983f48" ON "post_tags"("fk_tag_id");

-- CreateIndex
CREATE INDEX "posts_created_at" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_fk_user_id" ON "posts"("fk_user_id");

-- CreateIndex
CREATE INDEX "posts_is_private" ON "posts"("is_private");

-- CreateIndex
CREATE INDEX "posts_is_temp" ON "posts"("is_temp");

-- CreateIndex
CREATE INDEX "posts_released_at" ON "posts"("released_at");

-- CreateIndex
CREATE INDEX "posts_released_at_idx" ON "posts"("released_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "posts_tsv" ON "posts" USING GIN ("tsv");

-- CreateIndex
CREATE INDEX "posts_url_slug" ON "posts"("url_slug");

-- CreateIndex
CREATE UNIQUE INDEX "posts_categories_fk_post_id_fk_category_id_key" ON "posts_categories"("fk_post_id", "fk_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "posts_tags_fk_post_id_fk_tag_id_key" ON "posts_tags"("fk_post_id", "fk_tag_id");

-- CreateIndex
CREATE INDEX "series_created_at" ON "series"("created_at");

-- CreateIndex
CREATE INDEX "series_fk_user_id" ON "series"("fk_user_id");

-- CreateIndex
CREATE INDEX "series_fk_user_id_url_slug" ON "series"("fk_user_id", "url_slug");

-- CreateIndex
CREATE INDEX "series_updated_at" ON "series"("updated_at");

-- CreateIndex
CREATE INDEX "series_posts_fk_post_id" ON "series_posts"("fk_post_id");

-- CreateIndex
CREATE INDEX "series_posts_fk_series_id" ON "series_posts"("fk_series_id");

-- CreateIndex
CREATE INDEX "social_accounts_provider_social_id" ON "social_accounts"("provider", "social_id");

-- CreateIndex
CREATE INDEX "IDX_38921256eca6f24170411db8ac" ON "tag_alias"("fk_tag_id");

-- CreateIndex
CREATE INDEX "IDX_7b79c9ec6899a16e12374462df" ON "tag_alias"("fk_alias_tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_is_alias" ON "tags"("is_alias");

-- CreateIndex
CREATE INDEX "tags_name_filtered" ON "tags"("name_filtered");

-- CreateIndex
CREATE INDEX "url_slug_histories_created_at" ON "url_slug_histories"("created_at");

-- CreateIndex
CREATE INDEX "url_slug_histories_url_slug" ON "url_slug_histories"("url_slug");

-- CreateIndex
CREATE INDEX "user_images_fk_user_id" ON "user_images"("fk_user_id");

-- CreateIndex
CREATE INDEX "user_images_ref_id" ON "user_images"("ref_id");

-- CreateIndex
CREATE INDEX "user_images_type" ON "user_images"("type");

-- CreateIndex
CREATE INDEX "IDX_3e1934c686ba81d69d94c7eaca" ON "user_images_cloudflare"("created_at");

-- CreateIndex
CREATE INDEX "IDX_47800d2104cdf1e4c7999e6357" ON "user_images_cloudflare"("fk_user_id");

-- CreateIndex
CREATE INDEX "IDX_889aa4a3b67cfe2860497cf352" ON "user_images_cloudflare"("result_id");

-- CreateIndex
CREATE INDEX "IDX_9dcb58703dd449a2b9d4f1837d" ON "user_images_cloudflare"("ref_id");

-- CreateIndex
CREATE INDEX "IDX_ecec86174f01962d927345e45b" ON "user_images_cloudflare"("tracked");

-- CreateIndex
CREATE INDEX "IDX_0c612fa2d1476216b46248ba97" ON "user_images_next"("tracked");

-- CreateIndex
CREATE INDEX "IDX_9d2936750a40b9b10b860c8f77" ON "user_images_next"("fk_user_id");

-- CreateIndex
CREATE INDEX "IDX_a46dbd7f1bb6c6583c57fd63a0" ON "user_images_next"("ref_id");

-- CreateIndex
CREATE INDEX "IDX_db3cf1ab4238e91d026b5a8977" ON "user_images_next"("created_at");

-- CreateIndex
CREATE INDEX "user_meta_fk_user_id" ON "user_meta"("fk_user_id");

-- CreateIndex
CREATE INDEX "user_profiles_fk_user_id" ON "user_profiles"("fk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "REL_8b5be783e08f563452ec0c489e" ON "velog_configs"("fk_user_id");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "FK_548ae43e47192962c941abbc4d1" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_71e1bb3fd8c767a404b1a6a211e" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "email_cert" ADD CONSTRAINT "email_cert_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "follow_tag" ADD CONSTRAINT "follow_tag_fk_tag_id_fkey" FOREIGN KEY ("fk_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "follow_tag" ADD CONSTRAINT "follow_tag_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "follow_user" ADD CONSTRAINT "follow_user_fk_follow_user_id_fkey" FOREIGN KEY ("fk_follow_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "follow_user" ADD CONSTRAINT "follow_user_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_histories" ADD CONSTRAINT "post_histories_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_images" ADD CONSTRAINT "post_images_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_read_logs" ADD CONSTRAINT "FK_7b37d3334ab7d049a97f8b2ee0c" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "post_read_logs" ADD CONSTRAINT "FK_d4fd1d180f05445287d377ba49c" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "post_reads" ADD CONSTRAINT "post_reads_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_reads" ADD CONSTRAINT "post_reads_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_scores" ADD CONSTRAINT "post_scores_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_scores" ADD CONSTRAINT "post_scores_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "FK_3d4d13db047f2b2ca7671b84034" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "FK_4de7a827965a085c53d7983f480" FOREIGN KEY ("fk_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "posts_categories" ADD CONSTRAINT "posts_categories_fk_category_id_fkey" FOREIGN KEY ("fk_category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "posts_categories" ADD CONSTRAINT "posts_categories_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "posts_tags" ADD CONSTRAINT "posts_tags_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "posts_tags" ADD CONSTRAINT "posts_tags_fk_tag_id_fkey" FOREIGN KEY ("fk_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "series_posts" ADD CONSTRAINT "series_posts_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "series_posts" ADD CONSTRAINT "series_posts_fk_series_id_fkey" FOREIGN KEY ("fk_series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "tag_alias" ADD CONSTRAINT "FK_38921256eca6f24170411db8ac7" FOREIGN KEY ("fk_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tag_alias" ADD CONSTRAINT "FK_7b79c9ec6899a16e12374462dfc" FOREIGN KEY ("fk_alias_tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "url_slug_histories" ADD CONSTRAINT "url_slug_histories_fk_post_id_fkey" FOREIGN KEY ("fk_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "url_slug_histories" ADD CONSTRAINT "url_slug_histories_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_images" ADD CONSTRAINT "user_images_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_images_cloudflare" ADD CONSTRAINT "FK_47800d2104cdf1e4c7999e6357a" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_images_next" ADD CONSTRAINT "FK_9d2936750a40b9b10b860c8f772" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_meta" ADD CONSTRAINT "user_meta_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_thumbnails" ADD CONSTRAINT "user_thumbnails_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "velog_configs" ADD CONSTRAINT "FK_8b5be783e08f563452ec0c489e1" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

