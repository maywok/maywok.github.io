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

		this.px = new Float32Array(this.segments + 1);
		this.py = new Float32Array(this.segments + 1);
		this.vx = new Float32Array(this.segments + 1);
		this.vy = new Float32Array(this.segments + 1);
		this.prevPx = new Float32Array(this.segments + 1);
		this.prevPy = new Float32Array(this.segments + 1);
		this.drawX = new Float32Array(this.segments + 1);
		this.drawY = new Float32Array(this.segments + 1);
		this.baseX = x;
		this.baseY = 0;
		this.restLen = this.length / this.segments;
		for (let i = 0; i <= this.segments; i++) {
			this.px[i] = this.baseX;
			this.py[i] = (i / this.segments) * this.length;
			this.prevPx[i] = this.px[i];
			this.prevPy[i] = this.py[i];
			this.drawX[i] = this.px[i];
			this.drawY[i] = this.py[i];
		}

		this.damping = 0.989;
		this.constraintIterations = 8;
		this.bendStiffness = 0.12;
		this.gravity = 980;
		this.windAmp = 0;
		this.windFreq = 0.9;

		this.contactRadius = 8;
		this.mouseRadius = 16;
		this.mouseReleaseFactor = 1.6;
		this._mouseLatched = false;
		this.grabRadius = 18;
		this._grabbedIndex = -1;
		this.hue = 0xff5a6e;
	}

	setColor(hue) {
		if (typeof hue === 'number') this.hue = hue;
	}

	getPointCount() {
		return this.segments + 1;
	}
	getPoint(i) {
		return { x: this.drawX[i], y: this.drawY[i] };
	}
	getPointsView() {
		return { x: this.drawX, y: this.drawY, count: this.segments + 1 };
	}

	static _distToSegmentSq(px, py, ax, ay, bx, by) {
		const abx = bx - ax;
		const aby = by - ay;
		const apx = px - ax;
		const apy = py - ay;
		const abLenSq = abx * abx + aby * aby;
		let t = abLenSq > 1e-6 ? (apx * abx + apy * aby) / abLenSq : 0;
		t = Math.max(0, Math.min(1, t));
		const cx = ax + t * abx;
		const cy = ay + t * aby;
		const dx = px - cx;
		const dy = py - cy;
		return dx * dx + dy * dy;
	}

	static _clamp(v, lo, hi) {
		return Math.max(lo, Math.min(hi, v));
	}

	update(time, mouse, dt = 1 / 60) {
		dt = Math.min(Math.max(dt, 1 / 240), 1 / 30);
		const amp = this.windAmp;
		const freq = this.windFreq;
		const hue = this.hue;
		this.line.clear();
		this.glow.clear();
		this.glow.lineStyle(16, hue, 0.32);
		this.line.lineStyle(4, hue, 1.0);

		let minLineSq = Infinity;
		let bestSegI = 1;
		if (mouse) {
			for (let i = 1; i <= this.segments; i++) {
				const ax = this.drawX[i - 1];
				const ay = this.drawY[i - 1];
				const bx = this.drawX[i];
				const by = this.drawY[i];
				const dSq = Vine._distToSegmentSq(mouse.x, mouse.y, ax, ay, bx, by);
				if (dSq < minLineSq) {
					minLineSq = dSq;
					bestSegI = i;
				}
			}
			const grabR = this.mouseRadius + this.contactRadius;
			const relR = grabR * this.mouseReleaseFactor;
			if (!this._mouseLatched) this._mouseLatched = minLineSq <= grabR * grabR;
			else this._mouseLatched = minLineSq <= relR * relR;

			if (!mouse.down) {
				this._grabbedIndex = -1;
			} else if (this._grabbedIndex === -1 && minLineSq <= this.grabRadius * this.grabRadius) {
				this._grabbedIndex = Vine._clamp(bestSegI, 1, this.segments);
			}
		} else {
			this._mouseLatched = false;
			this._grabbedIndex = -1;
		}

		for (let i = 0; i <= this.segments; i++) {
			this.prevPx[i] = this.px[i];
			this.prevPy[i] = this.py[i];
		}

		for (let i = 0; i <= this.segments; i++) {
			if (i === 0) {
				this.px[i] = this.baseX;
				this.py[i] = this.baseY;
				this.vx[i] = 0;
				this.vy[i] = 0;
				continue;
			}
			this.vy[i] += this.gravity * dt;
			const t = i / this.segments;
			const wind = Math.sin(time * freq + i * 0.25) * amp * (0.25 + 0.75 * t);
			this.vx[i] += wind * dt;

			this.vx[i] *= this.damping;
			this.vy[i] *= this.damping;
			this.px[i] += this.vx[i] * dt;
			this.py[i] += this.vy[i] * dt;
		}

		if (mouse && mouse.down && this._grabbedIndex !== -1) {
			this._mouseLatched = true;
			const gi = this._grabbedIndex;
			this.px[gi] = mouse.x;
			this.py[gi] = mouse.y;
			this.vx[gi] *= 0.2;
			this.vy[gi] *= 0.2;
		}

		for (let it = 0; it < this.constraintIterations; it++) {
			
			this.px[0] = this.baseX;
			this.py[0] = this.baseY;
			for (let i = 1; i <= this.segments; i++) {
				const ax = this.px[i - 1];
				const ay = this.py[i - 1];
				let bx = this.px[i];
				let by = this.py[i];
				const dx = bx - ax;
				const dy = by - ay;
				const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
				const diff = (d - this.restLen) / d;
				
				bx -= dx * diff;
				by -= dy * diff;
				this.px[i] = bx;
				this.py[i] = by;
			}

			
			for (let i = 1; i < this.segments; i++) {
				const ax = this.px[i - 1], ay = this.py[i - 1];
				const bx = this.px[i], by = this.py[i];
				const cx = this.px[i + 1], cy = this.py[i + 1];
				const mx = (ax + cx) * 0.5;
				const my = (ay + cy) * 0.5;
				this.px[i] = bx + (mx - bx) * this.bendStiffness;
				this.py[i] = by + (my - by) * this.bendStiffness;
			}

			
			if (mouse && this._mouseLatched) {
				const mr = this.mouseRadius;
				const mrSq = mr * mr;
				for (let i = 1; i <= this.segments; i++) {
					const dx = this.px[i] - mouse.x;
					const dy = this.py[i] - mouse.y;
					const dSq = dx * dx + dy * dy;
					if (dSq < mrSq) {
						const d = Math.sqrt(dSq) || 1e-6;
						const nx = dx / d;
						const ny = dy / d;
						this.px[i] = mouse.x + nx * mr;
						this.py[i] = mouse.y + ny * mr;
						
						this.vx[i] *= 0.6;
						this.vy[i] *= 0.6;
					}
				}
			}

			
			if (mouse && mouse.down && this._grabbedIndex !== -1) {
				this.px[this._grabbedIndex] = mouse.x;
				this.py[this._grabbedIndex] = mouse.y;
			}
		}

		for (let i = 0; i <= this.segments; i++) {
			if (i === 0) continue;
			this.vx[i] = (this.px[i] - this.prevPx[i]) / dt;
			this.vy[i] = (this.py[i] - this.prevPy[i]) / dt;
			this.vx[i] *= this.damping;
			this.vy[i] *= this.damping;
		}

		for (let i = 0; i <= this.segments; i++) {
			this.drawX[i] = this.drawX[i] * 0.45 + this.px[i] * 0.55;
			this.drawY[i] = this.drawY[i] * 0.45 + this.py[i] * 0.55;
		}

		for (let i = 0; i <= this.segments; i++) {
			const px = this.drawX[i];
			const py = this.drawY[i];
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