CREATE TYPE "public"."sex_type" AS ENUM('intercourse', 'manual', 'toy');--> statement-breakpoint
CREATE TABLE "sex_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"occurred_on" date NOT NULL,
	"occurred_time" time NOT NULL,
	"type" "sex_type" NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sex_entries" ADD CONSTRAINT "sex_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sex_entries" ADD CONSTRAINT "sex_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;