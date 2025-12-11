// Module entry: boots PIXI and uses local placeholders from shaders/player/vines.
// Assumes PIXI is available globally via CDN in index.html.
import { createCRTFilter, updateCRTFilter } from './shaders.js';
import { Player } from './player.js';
import { createVines } from './vines.js';

function boot() {
	try {
		const root = document.getElementById('game-root');
		if (!root) {
			throw new Error('Missing #game-root element');
		}

		const app = new PIXI.Application({
			resizeTo: window,
			background: 0x000000,
			antialias: true,
		});
		root.appendChild(app.view);

		const { filter, uniforms } = createCRTFilter(app);
		const container = new PIXI.Container();
		app.stage.addChild(container);

		const gfx = new PIXI.Graphics();
		gfx.beginFill(0x000000);
		gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
		gfx.endFill();
		container.addChild(gfx);
		container.filters = [filter];

		const player = new Player();
		const vines = createVines(12);

		app.ticker.add((dt) => {
			updateCRTFilter({ uniforms }, app, dt / 60);
			player.update(dt / 60);
		});

		window.addEventListener('resize', () => {
			gfx.clear();
			gfx.beginFill(0x000000);
			gfx.drawRect(0, 0, app.renderer.width, app.renderer.height);
			gfx.endFill();
		});
	} catch (err) {
		console.error('Game boot failed:', err);
		const root = document.getElementById('game-root');
		if (root) {
			const pre = document.createElement('pre');
			pre.textContent = 'Error initializing game:\n' + (err && err.stack ? err.stack : String(err));
			pre.style.color = '#ff6';
			pre.style.padding = '1rem';
			pre.style.background = '#000';
			root.appendChild(pre);
		}
	}
}

boot();