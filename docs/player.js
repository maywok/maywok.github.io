// Neon cube player placeholder
export class Player {
	constructor(app, x = app.renderer.width / 2, y = Math.max(80, app.renderer.height - 120), size = 28) {
		this.app = app;
		this.size = size;
		this.view = new PIXI.Container();

		const glow = new PIXI.Graphics();
		// Simulate glow without filters by drawing a larger, semi-transparent rect
		glow.beginFill(0x00ffc8, 0.22);
		glow.drawRoundedRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6, 8);
		glow.endFill();

		const box = new PIXI.Graphics();
		box.beginFill(0x00ffc8);
		box.drawRoundedRect(-size / 2, -size / 2, size, size, 6);
		box.endFill();

		this.view.addChild(glow);
		this.view.addChild(box);
		this.view.position.set(x, y);

		this.baseY = y;
		this.time = 0;
	}

	update(dt) {
		this.time += dt;
		this.view.y = this.baseY + Math.sin(this.time * 2.5) * 2; // subtle bob
	}

	onResize() {
		this.view.x = this.app.renderer.width / 2;
		this.baseY = Math.max(80, this.app.renderer.height - 120);
	}
}