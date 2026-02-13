export class Vine {
	constructor(app, x, length = 160, segments = 22, options = {}) {
		this.app = app;
		this.x = x;
		this.length = length;
		this.segments = segments;
		this.view = new PIXI.Container();
		this.glow = new PIXI.Graphics();
		this.line = new PIXI.Graphics();
		this.packetLayer = new PIXI.Graphics();
		this.anchorLayer = new PIXI.Graphics();
		this.view.addChild(this.glow);
		this.view.addChild(this.line);
		this.view.addChild(this.packetLayer);
		this.view.addChild(this.anchorLayer);

		const lamp = options?.lamp ?? {};
		this.lamp = {
			enabled: Boolean(lamp.enabled),
			color: typeof lamp.color === 'number' ? lamp.color : 0x42b8ff,
			glowColor: typeof lamp.glowColor === 'number' ? lamp.glowColor : 0x1e6bff,
			radius: typeof lamp.radius === 'number' ? lamp.radius : 7,
			glowRadius: typeof lamp.glowRadius === 'number' ? lamp.glowRadius : 26,
			glowAlpha: typeof lamp.glowAlpha === 'number' ? lamp.glowAlpha : 0.35,
			coreAlpha: typeof lamp.coreAlpha === 'number' ? lamp.coreAlpha : 0.95,
		};
		if (this.lamp.enabled) {
			this.lampGlow = new PIXI.Graphics();
			this.lampCore = new PIXI.Graphics();
			this.lampGlow.blendMode = PIXI.BLEND_MODES.ADD;
			this.lampCore.blendMode = PIXI.BLEND_MODES.ADD;
			this.view.addChild(this.lampGlow);
			this.view.addChild(this.lampCore);
		}

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
		this.hue = 0xffffff;
		this.packetPhase = Math.random() * Math.PI * 2;
		this.packetSpeed = 95 + Math.random() * 30;
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
	getLampPosition() {
		return { x: this.drawX[this.segments], y: this.drawY[this.segments] };
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
		this.packetLayer.clear();
		this.anchorLayer.clear();
		if (this.lamp?.enabled) {
			this.lampGlow.clear();
			this.lampCore.clear();
		}
		const r = (hue >> 16) & 255;
		const g = (hue >> 8) & 255;
		const b = hue & 255;
		const sheathColor = (Math.max(0, Math.min(255, Math.round(r * 0.22))) << 16)
			| (Math.max(0, Math.min(255, Math.round(g * 0.22))) << 8)
			| Math.max(0, Math.min(255, Math.round(b * 0.22)));
		const coreColor = (Math.max(0, Math.min(255, Math.round(r * 0.62 + 22))) << 16)
			| (Math.max(0, Math.min(255, Math.round(g * 0.62 + 22))) << 8)
			| Math.max(0, Math.min(255, Math.round(b * 0.62 + 22)));
		this.glow.lineStyle(10, hue, 0.14);
		this.line.lineStyle(6, sheathColor, 0.95);

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

		this.line.lineStyle(2, coreColor, 0.95);
		for (let i = 0; i <= this.segments; i++) {
			const px = this.drawX[i];
			const py = this.drawY[i];
			if (i === 0) this.line.moveTo(px, py);
			else this.line.lineTo(px, py);
		}

		this.line.lineStyle(3, hue, 0.22);
		for (let i = 1; i <= this.segments; i += 2) {
			const ax = this.drawX[i - 1];
			const ay = this.drawY[i - 1];
			const bx = this.drawX[i];
			const by = this.drawY[i];
			const dx = bx - ax;
			const dy = by - ay;
			const d = Math.hypot(dx, dy) || 1;
			const nx = -dy / d;
			const ny = dx / d;
			const mx = (ax + bx) * 0.5;
			const my = (ay + by) * 0.5;
			const tick = 3;
			this.line.moveTo(mx - nx * tick, my - ny * tick);
			this.line.lineTo(mx + nx * tick, my + ny * tick);
		}

		let totalLen = 0;
		for (let i = 1; i <= this.segments; i++) {
			const dx = this.drawX[i] - this.drawX[i - 1];
			const dy = this.drawY[i] - this.drawY[i - 1];
			totalLen += Math.hypot(dx, dy);
		}
		if (totalLen > 1) {
			const samplePacket = (distance) => {
				let remain = distance;
				for (let i = 1; i <= this.segments; i++) {
					const ax = this.drawX[i - 1];
					const ay = this.drawY[i - 1];
					const bx = this.drawX[i];
					const by = this.drawY[i];
					const segLen = Math.hypot(bx - ax, by - ay);
					if (remain <= segLen || i === this.segments) {
						const tSeg = segLen > 0 ? (remain / segLen) : 0;
						return {
							x: ax + (bx - ax) * tSeg,
							y: ay + (by - ay) * tSeg,
						};
					}
					remain -= segLen;
				}
				return { x: this.drawX[this.segments], y: this.drawY[this.segments] };
			};

			const packetSpacing = totalLen / 3;
			for (let i = 0; i < 3; i++) {
				const distance = (time * this.packetSpeed + this.packetPhase * 40 + i * packetSpacing) % totalLen;
				const p = samplePacket(distance);
				this.packetLayer.beginFill(hue, 0.92);
				this.packetLayer.drawCircle(p.x, p.y, 2.2);
				this.packetLayer.endFill();
				this.packetLayer.beginFill(0xffffff, 0.35);
				this.packetLayer.drawCircle(p.x, p.y, 4.4);
				this.packetLayer.endFill();
			}
		}

		const topX = this.drawX[0];
		const topY = this.drawY[0];
		this.anchorLayer.beginFill(0x0a1614, 0.95);
		this.anchorLayer.lineStyle(1, hue, 0.45);
		this.anchorLayer.drawRoundedRect(topX - 8, topY - 3, 16, 6, 2);
		this.anchorLayer.endFill();
		this.anchorLayer.beginFill(hue, 0.65);
		this.anchorLayer.drawRect(topX - 1, topY - 2, 2, 4);
		this.anchorLayer.endFill();

		const endX = this.drawX[this.segments];
		const endY = this.drawY[this.segments];
		this.anchorLayer.beginFill(0x0a1614, 0.95);
		this.anchorLayer.lineStyle(1, hue, 0.5);
		this.anchorLayer.drawRoundedRect(endX - 5, endY - 5, 10, 10, 3);
		this.anchorLayer.endFill();
		this.anchorLayer.beginFill(hue, 0.6);
		this.anchorLayer.drawCircle(endX, endY, 1.5);
		this.anchorLayer.endFill();

		if (this.lamp?.enabled) {
			const lx = this.drawX[this.segments];
			const ly = this.drawY[this.segments];
			const pulse = 0.85 + 0.15 * Math.sin(time * 2.1 + this.baseX * 0.03);
			this.lampGlow.beginFill(this.lamp.glowColor, this.lamp.glowAlpha * pulse);
			this.lampGlow.drawCircle(lx, ly, this.lamp.glowRadius);
			this.lampGlow.endFill();
			this.lampCore.beginFill(this.lamp.color, this.lamp.coreAlpha);
			this.lampCore.drawCircle(lx, ly, this.lamp.radius);
			this.lampCore.endFill();
		}
	}
}

export function createVines(app, count = 10, edgePadding = 8, options = {}) {
	const container = new PIXI.Container();
	const vines = [];
	const usableWidth = Math.max(1, app.renderer.width - edgePadding * 2);
	const spacing = count > 1 ? (usableWidth / (count - 1)) : 0;
	const maxLength = Math.max(120, Math.floor(app.renderer.height * 0.25));
	for (let i = 0; i < count; i++) {
		const x = Math.floor(edgePadding + i * spacing);
		const vine = new Vine(app, x, maxLength, 24, options);
		container.addChild(vine.view);
		vines.push(vine);
	}
	return { container, vines };
}