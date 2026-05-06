export type GalleryImage = {
	src: string;
	title?: string;
	tag?: string;
};

export type ProjectLink = {
	label: string;
	url: string;
	external?: boolean;
};

export type Project = {
	slug: string;
	title: string;
	tagline: string;
	bg: string;
	fg: string;
	accent?: string;
	logo?: string;
	logoStyle?: "circle" | "natural";
	titleFont?: string;
	gallery?: GalleryImage[];
	about?: string;
	links?: ProjectLink[];
};

export const projects: Project[] = [
	{
		slug: "sundain",
		title: "sundain",
		tagline:
			"an ai-powered social platform that understands you through conversation — helping you keep up with friends and meet new people through genuine alignment, not engagement bait.",
		bg: "#1a1a1a",
		fg: "#ffffff",
		accent: "#facc15",
		logo: "/projects/sundain-logo.png",
		logoStyle: "circle",
		titleFont: "'Caveat Brush', cursive",
		gallery: [
			{
				src: "/projects/sundain-chat.png",
				title: "in-app chat",
				tag: "chat",
			},
		],
		about:
			"Sundain is an experiment in conversation-first social. Instead of feeds and engagement metrics, the [[chat]] is the entire interface — you talk to the assistant about people, plans, and how you actually feel, and it surfaces the ones you should reconnect with or meet.",
		links: [
			{ label: "sundain.com", url: "https://sundain.com", external: true },
		],
	},
	{
		slug: "toughskill",
		title: "TOUGHSKILL",
		tagline:
			"a soft-skills learning platform with short, playful lessons rooted in self-determination theory — no streaks, no leaderboards.",
		bg: "#fafaf9",
		fg: "#1a1a1a",
		accent: "#14b8a6",
		logo: "/projects/toughskill-logo.png",
		titleFont: "'Gurajada', cursive",
		gallery: [
			{
				src: "/projects/ToughSkillPath.png",
				title: "learn path",
				tag: "path",
			},
			{
				src: "/projects/ToughSkillLesson.png",
				title: "lesson view",
				tag: "lesson",
			},
			{
				src: "/projects/ToughSkillAssignment.png",
				title: "assignment",
				tag: "assignment",
			},
			{
				src: "/projects/toughskill-cloudy.png",
				title: "cloudy",
				tag: "cloudy",
			},
		],
		about:
			"Toughskill is my BSc Software Engineering dissertation project. The premise: most existing skill-learning platforms (Duolingo, etc.) lean hard on extrinsic motivators — streaks, leaderboards, points — which research in self-determination theory suggests can erode intrinsic motivation over time. Toughskill builds short, playful lessons around communication, creativity, and work ethic — a learner picks a [[path]], works through each [[lesson]], and applies what they learnt in an [[assignment]], guided by a mascot called [[cloudy]], without the competitive scaffolding.",
		links: [
			{
				label: "toughskill.lnrdbr.com",
				url: "https://toughskill.lnrdbr.com",
				external: true,
			},
		],
	},
	{
		slug: "lightshow-studio",
		title: "LIGHTSHOW STUDIO",
		tagline:
			"a browser-based editor for music-synced light shows — loads midi and audio, aligns them on a timeline, and maps effects to triggers.",
		bg: "#000000",
		fg: "#ffffff",
		accent: "#ec4899",
		gallery: [
			{
				src: "/projects/lightshow-studio.png",
				title: "studio editor",
				tag: "editor",
			},
		],
		about:
			"Lightshow Studio powers the live visuals on /music. It ingests a MIDI file alongside the rendered audio, aligns them in the [[editor]], and exposes every note and CC as a trigger you can bind to lighting effects — pulses, strobes, color sweeps, ADSR envelopes. Shows are exported as JSON and replayed at runtime, synced to the AudioContext clock.",
		links: [{ label: "see it live on /music", url: "/music" }],
	},
];

export function getProject(slug: string): Project | undefined {
	return projects.find((p) => p.slug === slug);
}
