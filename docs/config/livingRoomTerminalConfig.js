export const TERMINAL_RAINBOW_FILL = ['#ff5f9c', '#ffd56b', '#6dff9a', '#6ec6f7'];

export const DEFAULT_TERMINAL_TEXT = [
	'MAIN PAGE',
	'the magic happens here',
	'Thanks for visiting my page! There might be some cool stuff if you poke around a bit :)',
].join('\n');

export function createStaticTerminalKeywords(styles = {}) {
	const {
		PORTFOLIO_HIGHLIGHT_ACCENT,
		PORTFOLIO_HIGHLIGHT_RAINBOW,
	} = styles;
	return [
		{ text: 'Tauri', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
		{ text: 'Rust', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
		{ text: 'TypeScript', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'UI hierarchy', style: PORTFOLIO_HIGHLIGHT_RAINBOW },
		{ text: 'filesystem scanning', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'registry queries', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'Firebase', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'Steam API', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'cross-platform', style: PORTFOLIO_HIGHLIGHT_ACCENT },
		{ text: 'animation system', style: PORTFOLIO_HIGHLIGHT_ACCENT },
	];
}
