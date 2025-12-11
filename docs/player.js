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
		this.jumpSpeed = 420; // initial jump velocity
		this.grounded = true;
		// Advanced jump feel
		this.coyoteTimeMax = 0.08; // seconds allowed to jump after leaving ground
		this.coyoteTime = 0;
		this.jumpBufferMax = 0.12; // seconds to buffer a jump press before landing
		this.jumpBuffer = 0;
		this.jumpHeld = false;
		this.jumpHoldGravityScale = 0.45; // lower gravity while holding for variable height
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
			if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
				this.jumpHeld = true;
				// If grounded or within coyote time, start jump
				if (this.grounded || this.coyoteTime > 0) {
					this.vy = -this.jumpSpeed;
					this.grounded = false;
					this.coyoteTime = 0;
					this.jumpBuffer = 0;
				} else {
					// Buffer the jump to execute on next landing
					this.jumpBuffer = this.jumpBufferMax;
				}
			}
		};
		this._onKeyUp = (e) => {
			const code = e.code;
			this.keys.delete(code);
			if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
				this.jumpHeld = false;
			}
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

		// Gravity and jump physics (variable height when jump is held)
		const gravityScale = (!this.grounded && this.jumpHeld && this.vy < 0) ? this.jumpHoldGravityScale : 1.0;
		this.vy += this.gravity * gravityScale * dt;
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
			// If a jump was buffered, consume it now
			if (this.jumpBuffer > 0) {
				this.vy = -this.jumpSpeed;
				this.grounded = false;
				this.jumpBuffer = 0;
			}
		} else {
			this.grounded = false;
		}
		// Ceiling clamp
		if (this.view.y < margin) {
			this.view.y = margin;
			this.vy = Math.max(0, this.vy);
		}

		// Timers: coyote and jump buffer
		this.coyoteTime = this.grounded ? this.coyoteTimeMax : Math.max(0, this.coyoteTime - dt);
		this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

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