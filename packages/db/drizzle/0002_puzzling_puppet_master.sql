CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" varchar(32) NOT NULL,
	"current_node_id" varchar(255),
	"mode" varchar(32) DEFAULT 'bot' NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"flow_id" uuid,
	"chatwoot_conversation_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_tenant_phone_unique" ON "sessions" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE INDEX "sessions_tenant_id_idx" ON "sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sessions_phone_idx" ON "sessions" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "sessions_mode_idx" ON "sessions" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "whatsapp_instances_tenant_id_idx" ON "whatsapp_instances" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "whatsapp_instances_provider_idx" ON "whatsapp_instances" USING btree ("provider");