/*
  Warnings:

  - A unique constraint covering the columns `[jira_user_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jira_user_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_jira_user_id_key" ON "users"("jira_user_id");
