export const PORTFOLIO_MEDIA_IMAGE = 'image';
export const PORTFOLIO_MEDIA_GIF = 'gif';
export const PORTFOLIO_MEDIA_VIDEO = 'video';
export const PORTFOLIO_HIGHLIGHT_ACCENT = 'accent';
export const PORTFOLIO_HIGHLIGHT_RAINBOW = 'rainbow';

export const PORTFOLIO_EMPTY_SLIDE = {
	type: PORTFOLIO_MEDIA_IMAGE,
	src: './assets/images/Uh-Oh.png',
	title: 'Empty Slot',
	overview: 'No media has been attached to this slot yet.',
	design: 'Use this slot for future mockups, flow captures, or concept art.',
	technical: 'Attach a slides array to activate the full walkthrough for this project.',
	highlights: [],
	links: [],
};

export const PORTFOLIO_PROJECTS = [
	{
		id: 'default-home',
		label: 'MAIN PAGE',
		title: 'Main Page',
		summary: 'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
		status: 'ready',
		accent: 0x8eb8ff,
		useDesktopFeed: true,
		stack: ['Portfolio', 'PIXI', 'WebGL'],
		links: [],
		slides: [
			{
				type: PORTFOLIO_MEDIA_IMAGE,
				src: './assets/images/logo.png',
				title: 'masonwalker.tech',
				overview: 'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
				design: '',
				technical: '',
				highlights: [
					{ text: 'bro-link synced', style: PORTFOLIO_HIGHLIGHT_ACCENT },
				],
				links: [],
			},
		],
	},
	{
		id: 'slot-b',
		label: 'LAUNCHER',
		title: 'Tile Manager',
		summary: 'A modular launcher workflow focused on legible states and quick handoff.',
		status: 'ready',
		accent: 0xcf5f8f,
		stack: ['Tauri', 'Rust', 'TypeScript'],
		links: [
			{ label: 'Repository', url: 'https://github.com/maywok/maywok.github.io' },
		],
		slides: [
			{
				type: PORTFOLIO_MEDIA_IMAGE,
				src: './assets/portfolio/launcher/home.png',
				title: 'Home Surface',
				overview: 'This is the main page where you get to choose what system you want to launch.',
				design: 'I was inspired by the clean Frutiger Aero design of many Nintendo frontends such as the Wii and 3DS home menu, my main goal was to have style and substance work together so I focused on making sure the UI hierarchy was clear and the launcher actions were easy to understand at a glance.',
				technical: 'Nothing here yet :)',
				highlights: [
					{ text: 'UI hierarchy', style: PORTFOLIO_HIGHLIGHT_ACCENT },
					{ text: 'TypeScript', style: PORTFOLIO_HIGHLIGHT_ACCENT },
					{ text: 'Rust', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
				],
				links: [
					{ label: 'home.png', url: './assets/portfolio/launcher/home.png' },
				],
			},
			{
				type: PORTFOLIO_MEDIA_IMAGE,
				src: './assets/portfolio/launcher/menu.png',
				title: 'Menu State',
				overview: 'This is the menu that appears after clicking a system, it shows the games detected for that system and allows you to launch them! There is also bonus customization for your games such as custom icons.',
				design: 'Nothing here yet :)',
				technical: 'Nothing here yet :)',
				highlights: [
					{ text: 'Tauri', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
					{ text: 'filesystem scanning', style: PORTFOLIO_HIGHLIGHT_ACCENT },
					{ text: 'registry queries', style: PORTFOLIO_HIGHLIGHT_ACCENT },
				],
				links: [
					{ label: 'menu.png', url: './assets/portfolio/launcher/menu.png' },
				],
			},
			{
				type: PORTFOLIO_MEDIA_IMAGE,
				src: './assets/images/Uh-Oh.png',
				title: 'Uh-Oh Test Slide',
				overview: 'Test for different media sizes',
				design: 'This is a test!',
				technical: 'How are you? Remember to drink water',
				highlights: [
					{ text: 'cross-platform', style: PORTFOLIO_HIGHLIGHT_ACCENT },
					{ text: 'animation system', style: PORTFOLIO_HIGHLIGHT_ACCENT },
				],
				links: [
					{ label: 'Uh-Oh.png', url: './assets/images/Uh-Oh.png' },
				],
			},
		],
	},
	{ id: 'slot-c', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0xd5a063, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
	{ id: 'slot-d', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0xb58a59, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
	{ id: 'slot-e', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0x4f80bf, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
	{ id: 'slot-f', label: 'EMPTY', title: 'Empty Slot', summary: 'No project assigned yet.', status: 'empty', accent: 0x7a659d, stack: [], links: [], slides: [PORTFOLIO_EMPTY_SLIDE] },
];

export const portfolioProjectsById = new Map(PORTFOLIO_PROJECTS.map((project) => [project.id, project]));

export const VHS_TAPE_LIBRARY = PORTFOLIO_PROJECTS.map((project) => ({
	id: project.id,
	projectId: project.id,
	label: project.label,
	title: project.title,
	status: project.status,
	hasContent: project.status !== 'empty',
	accent: project.accent,
	summary: project.summary,
}));
