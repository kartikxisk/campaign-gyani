-- Backfill campaign.type from the previous global mode for any pre-existing rows.
UPDATE "campaign"
SET "type" = COALESCE((SELECT "mode" FROM "app_setting" WHERE "id" = 'app'), 'phishing')
WHERE "type" = 'phishing'
  AND EXISTS (SELECT 1 FROM "app_setting" WHERE "id" = 'app' AND "mode" IS NOT NULL);
