import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const [post] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.slug, params.slug), eq(posts.isPublic, true)))
		.limit(1);

	if (!post) {
		throw error(404, 'Post not found');
	}

	return { post, title: post.title };
}
