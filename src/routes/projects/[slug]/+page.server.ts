import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
	const [project] = await db
		.select()
		.from(projects)
		.where(eq(projects.slug, params.slug))
		.limit(1);

	if (!project) error(404, 'Project not found');

	return { project, title: project.title };
}
