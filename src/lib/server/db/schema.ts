import { sqliteTable, text } from 'drizzle-orm/sqlite-core';



export const posts = sqliteTable('posts', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	content: text('content').notNull()
});
