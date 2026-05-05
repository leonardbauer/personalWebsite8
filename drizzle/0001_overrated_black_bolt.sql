CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"src" text NOT NULL,
	"color" text,
	"bpm" integer,
	"midi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "songs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "report" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "gallery" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color_primary" text DEFAULT '#1a1a1a' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color_secondary" text DEFAULT '#f5f5f5' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "color_accent" text DEFAULT '#ff6600' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_slug_unique" UNIQUE("slug");