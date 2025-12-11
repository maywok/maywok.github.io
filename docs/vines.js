// Neon vines hanging from the top, animated sway
export class Vine {
	constructor(app, x, length = 160, segments = 22) {
		this.app = app;
		this.x = x;
		this.length = length;
		this.segments = segments;
		this.view = new PIXI.Container();
		this.glow = new PIXI.Graphics();
		this.line = new PIXI.Graphics();
		this.view.addChild(this.glow);
		this.view.addChild(this.line);

		// Simple physics state per segment (offset from baseline)
		this.offsets = new Float32Array(this.segments + 1);
		this.velocities = new Float32Array(this.segments + 1);
		this.smoothed = new Float32Array(this.segments + 1);
		this.stiffness = 65; // much stronger spring for fast response
		this.damping = 12.0; // keep stable while allowing quick movement
		this.influenceRadius = 120; // mouse influence in pixels
	}

	update(time, mouse, dt = 1 / 60) {
		const amp = 10; // sway amplitude
		const freq = 0.9; // slightly faster sway
		const hue = 0x00e6ff; // neon blue core
		this.line.clear();
		this.glow.clear();
		// Thick, semi-transparent glow behind the core
		this.glow.lineStyle(12, hue, 0.22);
		// Bright core line
		this.line.lineStyle(3, hue, 0.95);

		// Physics update: each segment is a damped spring to baseline + wind
		for (let i = 0; i <= this.segments; i++) {
			const t = i / this.segments;
			const y = t * this.length;
			// Tail should have freedom: boost wind toward the bottom
			const tailBoost = 0.4 + 0.6 * t; // more motion near the tip
			const wind = Math.sin(time * freq + i * 0.25) * amp * tailBoost;

			// Mouse influence: push segment away if mouse is close
			let mousePush = 0;
			if (mouse) {
				const dx = (this.x + this.offsets[i]) - mouse.x;
				const dy = y - mouse.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < this.influenceRadius) {
					const strength = (this.influenceRadius - dist) / this.influenceRadius;
					// Push horizontally based on mouse relative position
					const pushBoost = 0.6 + 0.4 * t; // stronger influence toward the tail
					mousePush += (dx > 0 ? 1 : -1) * strength * 60 * pushBoost;
				}
			}

			const target = wind + mousePush;
			// If close to cursor, snap to target for zero lag
			if (mouse && mousePush !== 0) {
				this.offsets[i] = target;
				this.velocities[i] = 0;
			} else {
				const displacement = this.offsets[i] - target;
				// Damped spring acceleration toward target
				const accel = -this.stiffness * displacement - this.damping * this.velocities[i];
				this.velocities[i] += accel * dt;
				this.offsets[i] += this.velocities[i] * dt;
			}

			this.smoothed[i] = this.offsets[i];
		}

		// Light neighbor smoothing for visual continuity
		for (let i = 1; i < this.segments; i++) {
			const o = this.offsets[i] * 0.6 + this.offsets[i - 1] * 0.2 + this.offsets[i + 1] * 0.2;
			this.smoothed[i] = o;
		}

		// Draw using smoothed offsets
		for (let i = 0; i <= this.segments; i++) {
			const t = i / this.segments;
			const y = t * this.length;
			const px = this.x + this.smoothed[i];
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
	const maxLength = Math.max(120, Math.floor(app.renderer.height * 0.25));
	for (let i = 1; i <= count; i++) {
		const x = Math.floor(i * spacing);
		const vine = new Vine(app, x, maxLength, 24);
		container.addChild(vine.view);
		vines.push(vine);
	}
	return { container, vines };
}