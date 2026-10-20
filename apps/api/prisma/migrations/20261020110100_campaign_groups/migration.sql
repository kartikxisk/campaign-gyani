-- CreateTable
CREATE TABLE "campaign_group" (
    "campaignId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "campaign_group_pkey" PRIMARY KEY ("campaignId","groupId")
);

-- AddForeignKey
ALTER TABLE "campaign_group" ADD CONSTRAINT "campaign_group_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_group" ADD CONSTRAINT "campaign_group_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "target_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
