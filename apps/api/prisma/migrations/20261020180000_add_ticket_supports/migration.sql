-- CreateTable
CREATE TABLE "ticket_supports" (
    "ticket_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_supports_pkey" PRIMARY KEY ("ticket_id","user_id")
);

-- AddForeignKey
ALTER TABLE "ticket_supports" ADD CONSTRAINT "ticket_supports_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_supports" ADD CONSTRAINT "ticket_supports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

