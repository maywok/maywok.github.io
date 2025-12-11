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

		// Movement state
		this.speed = 180; // pixels per second (horizontal)
		this.vx = 0;
		this.vy = 0;
		this.gravity = 820; // pixels per second^2
		this.jumpSpeed = 380; // initial jump velocity
		this.grounded = true;
		this.keys = new Set();
		this.baseY = y;
		this.time = 0;

		// Keyboard input handlers (WASD + arrow keys)
		this._onKeyDown = (e) => {
			const code = e.code;
			if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
				code === 'ArrowUp' || code === 'ArrowLeft' || code === 'ArrowDown' || code === 'ArrowRight') {
				this.keys.add(code);
			}
			if ((code === 'Space' || code === 'KeyW' || code === 'ArrowUp') && this.grounded) {
				this.vy = -this.jumpSpeed;
				this.grounded = false;
			}
		};
		this._onKeyUp = (e) => {
			const code = e.code;
			this.keys.delete(code);
		};
		window.addEventListener('keydown', this._onKeyDown);
		window.addEventListener('keyup', this._onKeyUp);
	}

	update(dt) {
		this.time += dt;

		// Determine movement axis from keys
		let ax = 0, ay = 0;
		if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ax -= 1;
		if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ax += 1;
		// Vertical input handled via jump; allow down key to nudge quickly
		if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ay += 1;

		// Normalize diagonal movement
		if (ax !== 0 && ay !== 0) {
			const inv = 1 / Math.sqrt(2);
			ax *= inv; ay *= inv;
		}

		// Apply horizontal movement
		this.view.x += ax * this.speed * dt;

		// Gravity and jump physics
		this.vy += this.gravity * dt;
		this.view.y += this.vy * dt;

		// Clamp to viewport with small margins
		const margin = 16;
		const w = this.app.renderer.width;
		const h = this.app.renderer.height;
		this.view.x = Math.max(margin, Math.min(w - margin, this.view.x));

		// Ground plane near bottom
		const groundY = Math.max(80, h - 120);
		if (this.view.y >= groundY) {
			this.view.y = groundY;
			this.vy = 0;
			this.grounded = true;
		} else {
			this.grounded = false;
		}
		// Ceiling clamp
		if (this.view.y < margin) {
			this.view.y = margin;
			this.vy = Math.max(0, this.vy);
		}

		// Subtle bob when idle
		if (ax === 0 && ay === 0 && this.grounded) {
			this.view.y = this.baseY + Math.sin(this.time * 2.5) * 2;
		} else {
			this.baseY = this.view.y;
		}
	}

	onResize() {
		// Keep player roughly centered horizontally and near bottom
		this.view.x = Math.max(16, Math.min(this.app.renderer.width - 16, this.app.renderer.width / 2));
		this.baseY = Math.max(80, this.app.renderer.height - 120);
		this.view.y = Math.max(16, Math.min(this.app.renderer.height - 16, this.baseY));
		this.vy = 0;
		this.grounded = true;
	}
}