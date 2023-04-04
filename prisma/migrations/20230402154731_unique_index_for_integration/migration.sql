-- CreateTable
CREATE TABLE "external_integration_histories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "app_identifier" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_user_id" UUID NOT NULL,

    CONSTRAINT "external_integration_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_integration_histories_fk_user_id_idx" ON "external_integration_histories"("fk_user_id");

-- CreateIndex
CREATE INDEX "external_integration_histories_app_identifier_idx" ON "external_integration_histories"("app_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "external_integration_histories_app_identifier_fk_user_id_key" ON "external_integration_histories"("app_identifier", "fk_user_id");

-- AddForeignKey
ALTER TABLE "external_integration_histories" ADD CONSTRAINT "external_integration_histories_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
