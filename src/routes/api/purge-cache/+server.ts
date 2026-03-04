import { CLOUDFLARE_ZONE_ID, CLOUDFLARE_API_TOKEN } from '$env/static/private';
import { json, error } from '@sveltejs/kit';

export async function POST({ request }) {
	if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
		throw error(500, 'Cloudflare credentials not configured');
	}

	const body = await request.json().catch(() => ({}));
	const { slug } = body;

	const filesToPurge = [
		'https://lnrdbr.com/',
		'https://lnrdbr.com/sitemap.xml',
		'https://lnrdbr.com/posts.atom'
	];

	if (slug) {
		filesToPurge.push(`https://lnrdbr.com/blog/${slug}`);
	}

	const response = await fetch(
		`https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ files: filesToPurge })
		}
	);

	const result = await response.json();

	if (!result.success) {
		throw error(500, 'Failed to purge cache');
	}

	return json({ success: true, purged: filesToPurge });
}
