CREATE TABLE "flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "flows" ADD CONSTRAINT "flows_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flows_tenant_id_idx" ON "flows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "flows_tenant_status_idx" ON "flows" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "flows_one_active_per_tenant" ON "flows" USING btree ("tenant_id") WHERE status = 'active' AND deleted_at IS NULL;