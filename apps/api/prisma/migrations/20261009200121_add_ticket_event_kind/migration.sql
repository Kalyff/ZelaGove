-- CreateEnum
CREATE TYPE "TicketEventKind" AS ENUM ('status', 'note');

-- AlterTable
ALTER TABLE "ticket_events" ADD COLUMN     "kind" "TicketEventKind" NOT NULL DEFAULT 'status';
