import { getDb } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
	});

	const db = getDb();
	const [post] = await db
		.select()
		.from(posts)
		.where(eq(posts.slug, params.slug))
		.limit(1);

	if (!post) {
		throw error(404, 'Post not found');
	}

	// Increment view count (fire and forget)
	db.update(posts)
		.set({ viewCount: sql`${posts.viewCount} + 1` })
		.where(eq(posts.slug, params.slug))
		.execute();

	return { post, title: post.title };
}
