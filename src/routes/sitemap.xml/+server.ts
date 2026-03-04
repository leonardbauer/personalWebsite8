import { getDb } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const SITE_URL = 'https://lnrdbr.com';

export async function GET() {
	const publicPosts = await getDb()
		.select({ slug: posts.slug, updatedAt: posts.updatedAt })
		.from(posts)
		.where(eq(posts.isPublic, true));

	const staticPages = ['', '/music', '/projects'];

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
	.map(
		(page) => `  <url>
    <loc>${SITE_URL}${page}</loc>
  </url>`
	)
	.join('\n')}
${publicPosts
	.map(
		(post) => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.updatedAt).toISOString().split('T')[0]}</lastmod>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
