import { error } from "@sveltejs/kit";
import { getProject } from "$lib/data/projects";

export const load = ({ params }: { params: { slug: string } }) => {
	const project = getProject(params.slug);
	if (!project) error(404, "Project not found");
	return { project };
};
