-- CreateTable
CREATE TABLE "ReviewJob" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issueCount" INTEGER,
    "tokenUsed" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewJob_deliveryId_key" ON "ReviewJob"("deliveryId");
