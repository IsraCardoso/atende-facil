ALTER TABLE "whatsapp_instances" ADD COLUMN "display_name" varchar(128);
--> statement-breakpoint
ALTER TABLE "whatsapp_instances" ADD COLUMN "is_primary" boolean DEFAULT false NOT NULL;
