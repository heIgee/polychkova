CREATE TABLE "list_image" (
	"id" text PRIMARY KEY NOT NULL,
	"listId" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list_image" ADD CONSTRAINT "list_image_listId_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "list_image_listId_idx" ON "list_image" USING btree ("listId");