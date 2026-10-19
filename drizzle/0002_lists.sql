CREATE TABLE "list" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"visibility" text DEFAULT 'unlisted' NOT NULL,
	"board" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "list_visibility_check" CHECK ("list"."visibility" in ('unlisted', 'public'))
);
--> statement-breakpoint
ALTER TABLE "list" ADD CONSTRAINT "list_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_userId_updatedAt_idx" ON "list" USING btree ("userId","updatedAt");