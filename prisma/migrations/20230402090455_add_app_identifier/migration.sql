/*
  Warnings:

  - Added the required column `app_identifier` to the `external_integrations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "external_integrations" ADD COLUMN     "app_identifier" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE INDEX "external_integrations_app_identifier_idx" ON "external_integrations"("app_identifier");
