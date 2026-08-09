-- CreateEnum
CREATE TYPE "AgencyKind" AS ENUM ('federal', 'estadual', 'concessionaria', 'secretaria', 'consorcio', 'outro');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'forwarded';

-- AlterTable
ALTER TABLE "ticket_events" ADD COLUMN     "agency_id" UUID,
ADD COLUMN     "external_protocol" TEXT;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "forwarded_to_id" UUID;

-- CreateTable
CREATE TABLE "agencies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AgencyKind" NOT NULL,
    "public_phone" TEXT,
    "public_url" TEXT,
    "public_note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agencies_active_name_idx" ON "agencies"("active", "name");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_forwarded_to_id_fkey" FOREIGN KEY ("forwarded_to_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
