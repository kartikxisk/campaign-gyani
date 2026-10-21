-- AlterTable
ALTER TABLE "app_setting" ADD COLUMN     "config" JSONB;

-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'phishing';
