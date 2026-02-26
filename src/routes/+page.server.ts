import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function load() {
	const allPosts = await db
		.select()
		.from(posts)
		.where(eq(posts.isPublic, true))
		.orderBy(desc(posts.createdAt));

	return { posts: allPosts, title: '' };
}
