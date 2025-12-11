// Neon vines hanging from the top, animated sway
export class Vine {
	constructor(app, x, length = 280, segments = 28) {
		this.app = app;
		this.x = x;
		this.length = length;
		this.segments = segments;
		this.view = new PIXI.Container();
		this.glow = new PIXI.Graphics();
		this.line = new PIXI.Graphics();
		// Soft glow
		this.glow.filters = [new PIXI.BlurFilter(3)];
		this.view.addChild(this.glow);
		this.view.addChild(this.line);
	}

	update(time) {
		const amp = 14; // sway amplitude
		const freq = 0.9; // sway frequency
		const hue = 0x00e6ff; // neon blue core
		this.line.clear();
		this.glow.clear();
		this.line.lineStyle(3, hue, 1);
		this.glow.lineStyle(10, hue, 0.33);

		for (let i = 0; i <= this.segments; i++) {
			const t = i / this.segments;
			const y = t * this.length;
			const offset = Math.sin(time * freq + i * 0.25) * amp * (1 - t);
			const px = this.x + offset;
			const py = y;
			if (i === 0) {
				this.line.moveTo(px, py);
				this.glow.moveTo(px, py);
			} else {
				this.line.lineTo(px, py);
				this.glow.lineTo(px, py);
			}
		}
	}
}

export function createVines(app, count = 10) {
	const container = new PIXI.Container();
	const vines = [];
	const spacing = app.renderer.width / (count + 1);
	const maxLength = Math.max(220, Math.floor(app.renderer.height * 0.4));
	for (let i = 1; i <= count; i++) {
		const x = Math.floor(i * spacing);
		const vine = new Vine(app, x, maxLength, 30);
		container.addChild(vine.view);
		vines.push(vine);
	}
	return { container, vines };
}