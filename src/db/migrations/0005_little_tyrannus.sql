CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'confirmed', 'received', 'overdue', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('none', 'pending', 'active', 'overdue', 'canceled');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"asaas_payment_id" text NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"value" numeric NOT NULL,
	"due_date" date NOT NULL,
	"paid_at" timestamp with time zone,
	"billing_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"monthly_response_limit" integer NOT NULL,
	"price_monthly" numeric NOT NULL,
	"price_annual" numeric NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "billing_cycle" "billing_cycle";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "asaas_customer_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "asaas_subscription_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_asaas_id_ux" ON "payments" USING btree ("asaas_payment_id");--> statement-breakpoint
CREATE INDEX "payments_client_ix" ON "payments" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;