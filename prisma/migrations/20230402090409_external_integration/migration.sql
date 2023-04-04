-- CreateTable
CREATE TABLE "external_integrations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "code" VARCHAR(64) NOT NULL,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fk_user_id" UUID NOT NULL,

    CONSTRAINT "external_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_integrations_code_key" ON "external_integrations"("code");

-- CreateIndex
CREATE INDEX "external_integrations_fk_user_id_idx" ON "external_integrations"("fk_user_id");

-- AddForeignKey
ALTER TABLE "external_integrations" ADD CONSTRAINT "external_integrations_fk_user_id_fkey" FOREIGN KEY ("fk_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
