/*
  Warnings:

  - A unique constraint covering the columns `[fk_user_id]` on the table `user_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_fk_user_id_key" ON "user_profiles"("fk_user_id");
