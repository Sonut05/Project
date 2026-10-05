-- DropIndex
DROP INDEX IF EXISTS "Review_requestId_targetType_key";

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "dailyPrice" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "depositAmount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "RentalRequest" ALTER COLUMN "rentalAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "depositAmount" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(10,2);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Conversation_participantAId_idx" ON "Conversation"("participantAId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Conversation_participantBId_idx" ON "Conversation"("participantBId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_lenderId_idx" ON "Item"("lenderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_listingStatus_idx" ON "Item"("listingStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_category_idx" ON "Item"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_createdAt_idx" ON "Item"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Item_listingStatus_category_idx" ON "Item"("listingStatus", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_itemId_idx" ON "RentalRequest"("itemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_lenderId_idx" ON "RentalRequest"("lenderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_borrowerId_idx" ON "RentalRequest"("borrowerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_status_idx" ON "RentalRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_startDate_endDate_idx" ON "RentalRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RentalRequest_itemId_status_idx" ON "RentalRequest"("itemId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_targetType_targetId_idx" ON "Review"("targetType", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_requestId_idx" ON "Review"("requestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Review_requestId_targetType_authorId_key" ON "Review"("requestId", "targetType", "authorId");
