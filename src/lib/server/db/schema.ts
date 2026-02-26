import { pgTable, text, uuid, timestamp, boolean } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').unique().notNull(),
	title: text('title').notNull(),
	content: text('content').notNull(),
	isPublic: boolean('is_public').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date())
});

export const projects = pgTable('projects', {
	id: uuid('id').primaryKey().defaultRandom(),
	image: text('image'),
	title: text('title').notNull(),
	content: text('content').notNull()
});
