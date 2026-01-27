export class Player {
	constructor(app, x = app.renderer.width / 2, y = Math.max(80, app.renderer.height - 120), size = 28) {
		this.app = app;
		this.size = size;
		this.view = new PIXI.Container();
		this._glow = new PIXI.Graphics();
		this._box = new PIXI.Graphics();
		this._colors = {
			fill: 0xf5e6c8,
			glow: 0xf5e6c8,
			glowAlpha: 0.22,
		};

		this.view.addChild(this._glow);
		this.view.addChild(this._box);
		this._redraw();
		this.view.position.set(x, y);

		this.maxSpeed = 260;
		this.groundAccel = 1800;
		this.airAccel = 900;
		this.groundFriction = 2200;
		this.airFriction = 180;
		this.vx = 0;
		this.vy = 0;
		this.gravity = 820;
		this.jumpSpeed = 430;
		this.grounded = true;
		this.coyoteTimeMax = 0.08;
		this.coyoteTime = 0;
		this.jumpBufferMax = 0.12;
		this.jumpBuffer = 0;
		this.jumpHeld = false;
		this.jumpHoldGravityScale = 0.45;
		this.keys = new Set();
		this.time = 0;

		this._onKeyDown = (e) => {
			const code = e.code;
			if (code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
				code === 'ArrowUp' || code === 'ArrowLeft' || code === 'ArrowDown' || code === 'ArrowRight') {
				this.keys.add(code);
			}
			if (code === 'Space' || code === 'KeyW' || code === 'ArrowUp') {
				this.jumpHeld = true;
				if (this.grounded || this.coyoteTime > 0) {
					this.vy = -this.jumpSpeed;
					this.grounded = false;
					this.coyoteTime = 0;
					this.jumpBuffer = 0;
				} else {
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

	_redraw() {
		const size = this.size;
		this._glow.clear();
		this._box.clear();
		this._glow.beginFill(this._colors.glow, this._colors.glowAlpha);
		this._glow.drawRoundedRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6, 8);
		this._glow.endFill();
		this._box.beginFill(this._colors.fill);
		this._box.drawRoundedRect(-size / 2, -size / 2, size, size, 6);
		this._box.endFill();
	}

	setColors({ fill, glow, glowAlpha } = {}) {
		if (typeof fill === 'number') this._colors.fill = fill;
		if (typeof glow === 'number') this._colors.glow = glow;
		if (typeof glowAlpha === 'number') this._colors.glowAlpha = glowAlpha;
		this._redraw();
	}

	update(dt) {
		this.time += dt;

		// Determine movement axis from keys
		let ax = 0, ay = 0;
		if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ax -= 1;
		if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ax += 1;
		if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ay += 1;

		if (ax !== 0 && ay !== 0) {
			const inv = 1 / Math.sqrt(2);
			ax *= inv; ay *= inv;
		}

		const targetAccel = this.grounded ? this.groundAccel : this.airAccel;
		const targetFriction = this.grounded ? this.groundFriction : this.airFriction;
		if (ax !== 0) {
			this.vx += ax * targetAccel * dt;
		} else {
			if (this.vx > 0) this.vx = Math.max(0, this.vx - targetFriction * dt);
			else if (this.vx < 0) this.vx = Math.min(0, this.vx + targetFriction * dt);
		}
		this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
		this.view.x += this.vx * dt;

		const gravityScale = (!this.grounded && this.jumpHeld && this.vy < 0) ? this.jumpHoldGravityScale : 1.0;
		this.vy += this.gravity * gravityScale * dt;
		this.view.y += this.vy * dt;

		const margin = 16;
		const w = this.app.renderer.width;
		const h = this.app.renderer.height;
		this.view.x = Math.max(margin, Math.min(w - margin, this.view.x));

		const groundY = Math.max(80, h - 120);
		if (this.view.y >= groundY) {
			this.view.y = groundY;
			this.vy = 0;
			this.grounded = true;
			if (this.jumpBuffer > 0) {
				this.vy = -this.jumpSpeed;
				this.grounded = false;
				this.jumpBuffer = 0;
			}
		} else {
			this.grounded = false;
		}
		if (this.view.y < margin) {
			this.view.y = margin;
			this.vy = Math.max(0, this.vy);
		}

		this.coyoteTime = this.grounded ? this.coyoteTimeMax : Math.max(0, this.coyoteTime - dt);
		this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
	}

	onResize() {
		this.view.x = Math.max(16, Math.min(this.app.renderer.width - 16, this.app.renderer.width / 2));
		const baseY = Math.max(80, this.app.renderer.height - 120);
		this.view.y = Math.max(16, Math.min(this.app.renderer.height - 16, baseY));
		this.vx = 0;
		this.vy = 0;
		this.grounded = true;
	}
}