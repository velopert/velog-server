/*
  Warnings:

  - Made the column `fk_user_id` on table `posts` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "posts" ALTER COLUMN "fk_user_id" SET NOT NULL;
