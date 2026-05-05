import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';

export async function load() {
	const allProjects = await db
		.select()
		.from(projects)
		.orderBy(asc(projects.sortOrder), asc(projects.title));

	return { projects: allProjects, title: 'Projects' };
}
