import { getDb } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { marked } from 'marked';

const SITE_URL = 'https://lnrdbr.com'; // Change to your domain
const SITE_TITLE = 'Leonard Bauer';
const AUTHOR_NAME = 'Leonard Bauer';

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

export async function GET() {
	const allPosts = await getDb()
		.select()
		.from(posts)
		.where(eq(posts.isPublic, true))
		.orderBy(desc(posts.createdAt));

	const lastUpdated = allPosts[0]?.updatedAt ?? new Date();

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_TITLE)}</title>
  <link href="${SITE_URL}/posts.atom" rel="self" type="application/atom+xml"/>
  <link href="${SITE_URL}" rel="alternate" type="text/html"/>
  <id>tag:${SITE_URL.replace('https://', '')},2025:feed</id>
  <updated>${lastUpdated.toISOString()}</updated>
  <icon>${SITE_URL}/favicon.png</icon>
  ${allPosts
		.map(
			(post) => `
  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${SITE_URL}/blog/${post.slug}" rel="alternate" type="text/html"/>
    <id>tag:${SITE_URL.replace('https://', '')},${new Date(post.createdAt).getFullYear()}:${post.slug}</id>
    <published>${new Date(post.createdAt).toISOString()}</published>
    <updated>${new Date(post.updatedAt).toISOString()}</updated>
    <content type="html"><![CDATA[${marked(post.content)}]]></content>
    <author>
      <name>${escapeXml(AUTHOR_NAME)}</name>
    </author>
  </entry>`
		)
		.join('')}
</feed>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml',
			'Cache-Control': 'max-age=3600'
		}
	});
}
