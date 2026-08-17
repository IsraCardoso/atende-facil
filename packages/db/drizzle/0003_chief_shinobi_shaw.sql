CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"phone" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'bot' NOT NULL,
	"assigned_to" uuid,
	"chatwoot_conversation_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_tenant_session_unique" ON "conversations" USING btree ("tenant_id","session_id");--> statement-breakpoint
CREATE INDEX "conversations_tenant_id_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversations_session_id_idx" ON "conversations" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "conversations_phone_idx" ON "conversations" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");