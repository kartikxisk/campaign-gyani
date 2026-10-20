-- CreateTable
CREATE TABLE "app_setting" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "mode" TEXT,
    "setAt" TIMESTAMP(3),

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("id")
);
