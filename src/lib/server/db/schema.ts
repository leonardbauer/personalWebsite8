import { pgTable, text, uuid, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').unique().notNull(),
	title: text('title').notNull(),
	content: text('content').notNull(),
	isPublic: boolean('is_public').default(false).notNull(),
	viewCount: integer('view_count').default(0).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date())
});

export const projects = pgTable('projects', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').unique().notNull(),
	image: text('image'),
	title: text('title').notNull(),
	tagline: text('tagline'),
	content: text('content').notNull(),
	report: text('report'),
	gallery: text('gallery').array().default([]).notNull(),
	colorPrimary: text('color_primary').default('#1a1a1a').notNull(),
	colorSecondary: text('color_secondary').default('#f5f5f5').notNull(),
	colorAccent: text('color_accent').default('#ff6600').notNull(),
	link: text('link'),
	sortOrder: integer('sort_order').default(0).notNull()
});

export const songs = pgTable('songs', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').unique().notNull(),
	title: text('title').notNull(),
	src: text('src').notNull(),
	color: text('color'),
	bpm: integer('bpm'),
	midi: text('midi'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
