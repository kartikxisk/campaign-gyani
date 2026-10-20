-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ResultStatus" AS ENUM ('SCHEDULED', 'SENDING', 'SENT', 'OPENED', 'CLICKED', 'SUBMITTED', 'REPORTED', 'ERROR');

-- CreateTable
CREATE TABLE "sending_profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "ignoreCertErrors" BOOLEAN NOT NULL DEFAULT false,
    "rateLimit" INTEGER NOT NULL DEFAULT 10,
    "maxConnections" INTEGER NOT NULL DEFAULT 5,
    "maxMessages" INTEGER NOT NULL DEFAULT 100,
    "pool" BOOLEAN NOT NULL DEFAULT true,
    "headers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sending_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "envelopeSender" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL DEFAULT '',
    "htmlBody" TEXT NOT NULL DEFAULT '',
    "externalUrl" TEXT,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_page" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "redirectUrl" TEXT NOT NULL,
    "captureData" BOOLEAN NOT NULL DEFAULT false,
    "capturePasswords" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "sendByDate" TIMESTAMP(3) NOT NULL,
    "launchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "landingPageId" TEXT,
    "sendingProfileId" TEXT,
    "shuffleTemplates" BOOLEAN NOT NULL DEFAULT false,
    "publicCode" TEXT,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_template" (
    "campaignId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "campaign_template_pkey" PRIMARY KEY ("campaignId","templateId")
);

-- CreateTable
CREATE TABLE "campaign_result" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "targetId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL DEFAULT '',
    "lastName" TEXT NOT NULL DEFAULT '',
    "position" TEXT NOT NULL DEFAULT '',
    "status" "ResultStatus" NOT NULL DEFAULT 'SCHEDULED',
    "rid" TEXT NOT NULL,
    "reported" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_event" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "target_groupId_email_key" ON "target"("groupId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_publicCode_key" ON "campaign"("publicCode");

-- CreateIndex
CREATE INDEX "campaign_status_launchedAt_idx" ON "campaign"("status", "launchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_result_rid_key" ON "campaign_result"("rid");

-- CreateIndex
CREATE INDEX "campaign_result_campaignId_status_idx" ON "campaign_result"("campaignId", "status");

-- CreateIndex
CREATE INDEX "campaign_event_resultId_type_idx" ON "campaign_event"("resultId", "type");

-- AddForeignKey
ALTER TABLE "target" ADD CONSTRAINT "target_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "target_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "landing_page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_sendingProfileId_fkey" FOREIGN KEY ("sendingProfileId") REFERENCES "sending_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_template" ADD CONSTRAINT "campaign_template_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_template" ADD CONSTRAINT "campaign_template_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_result" ADD CONSTRAINT "campaign_result_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_event" ADD CONSTRAINT "campaign_event_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "campaign_result"("id") ON DELETE CASCADE ON UPDATE CASCADE;
