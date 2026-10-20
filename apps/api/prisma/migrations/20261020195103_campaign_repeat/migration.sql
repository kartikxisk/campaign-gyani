-- AlterTable
ALTER TABLE "campaign" ADD COLUMN     "nextRunAt" TIMESTAMP(3),
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "repeat" TEXT;
