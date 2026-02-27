import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params, setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=3600, stale-while-revalidate=86400'
	});

	const [post] = await db
		.select()
		.from(posts)
		.where(eq(posts.slug, params.slug))
		.limit(1);

	if (!post) {
		throw error(404, 'Post not found');
	}

	return { post, title: post.title };
}
