export function createSystemHud(app, options = {}) {
	const {
		pixelFont = 'Minecraft, monospace',
		city = 'SEATTLE, WA',
		weather = 'CLEAR 72°F',
		accent = 0x22f3c8,
		parent,
	} = options;

	const container = new PIXI.Container();
	container.eventMode = 'none';

	const panel = new PIXI.Graphics();
	const header = new PIXI.Text('STATUS', {
		fontFamily: pixelFont,
		fontSize: 12,
		fill: accent,
		align: 'left',
		letterSpacing: 1,
	});

	const lineStyle = {
		fontFamily: pixelFont,
		fontSize: 12,
		fill: 0xeafbff,
		align: 'left',
		letterSpacing: 1,
	};

	const dateText = new PIXI.Text('', lineStyle);
	const timeText = new PIXI.Text('', lineStyle);
	const weatherText = new PIXI.Text('', lineStyle);
	const cityText = new PIXI.Text('', lineStyle);

	const iconLayer = new PIXI.Container();
	container.addChild(panel, iconLayer, header, dateText, timeText, weatherText, cityText);

	function drawPixelIcon(graphics, pixels, size, color = 0x22f3c8) {
		const px = Math.max(1, Math.round(size / 8));
		graphics.clear();
		graphics.beginFill(color, 0.95);
		for (let y = 0; y < pixels.length; y++) {
			for (let x = 0; x < pixels[y].length; x++) {
				if (pixels[y][x]) graphics.drawRect(x * px, y * px, px, px);
			}
		}
		graphics.endFill();
		const w = pixels[0].length * px;
		const h = pixels.length * px;
		graphics.pivot.set(w / 2, h / 2);
		graphics.position.set(w / 2, h / 2);
		return { w, h };
	}

	const ICONS = {
		calendar: [
			[1,1,1,1,1,1,1,1],
			[1,0,0,0,0,0,0,1],
			[1,1,1,1,1,1,1,1],
			[1,0,1,0,1,0,1,0],
			[1,0,0,1,0,0,1,0],
			[1,0,1,0,1,0,0,1],
			[1,0,0,1,0,1,0,1],
			[1,1,1,1,1,1,1,1],
		],
		clock: [
			[0,1,1,1,1,1,1,0],
			[1,0,0,0,0,0,0,1],
			[1,0,0,1,1,0,0,1],
			[1,0,0,0,1,0,0,1],
			[1,0,0,0,1,0,0,1],
			[1,0,0,0,0,0,0,1],
			[1,0,0,0,0,0,0,1],
			[0,1,1,1,1,1,1,0],
		],
		cloud: [
			[0,0,0,1,1,0,0,0],
			[0,1,1,1,1,1,1,0],
			[1,1,1,1,1,1,1,1],
			[1,1,1,1,1,1,1,1],
			[0,1,1,1,1,1,1,0],
			[0,0,0,0,0,0,0,0],
			[0,0,0,0,0,0,0,0],
			[0,0,0,0,0,0,0,0],
		],
		pin: [
			[0,0,0,1,0,0,0,0],
			[0,0,1,1,1,0,0,0],
			[0,1,1,1,1,1,0,0],
			[0,1,1,1,1,1,0,0],
			[0,0,1,1,1,0,0,0],
			[0,0,0,1,0,0,0,0],
			[0,0,0,1,0,0,0,0],
			[0,0,0,0,0,0,0,0],
		],
	};

	const iconDate = new PIXI.Graphics();
	const iconTime = new PIXI.Graphics();
	const iconWeather = new PIXI.Graphics();
	const iconCity = new PIXI.Graphics();
	iconLayer.addChild(iconDate, iconTime, iconWeather, iconCity);

	const iconState = {
		t: 0,
		base: [
			{ icon: iconDate, key: 'calendar', phase: 0.0 },
			{ icon: iconTime, key: 'clock', phase: 1.2 },
			{ icon: iconWeather, key: 'cloud', phase: 2.4 },
			{ icon: iconCity, key: 'pin', phase: 3.6 },
		],
	};
	(parent || app.stage).addChild(container);

	let lastTimeLabel = '';

	function formatTime() {
		const now = new Date();
		return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
	function formatDate() {
		const now = new Date();
		return now.toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase();
	}

	function updateText() {
		const timeLabel = `TIME ${formatTime()}`;
		if (timeLabel !== lastTimeLabel) {
			lastTimeLabel = timeLabel;
			timeText.text = timeLabel;
		}
		dateText.text = `DATE ${formatDate()}`;
		weatherText.text = `WEATHER ${weather}`;
		cityText.text = `CITY ${city}`;
	}

	function drawBadge(x, y, textObj, icon, padX = 10, padY = 6) {
		const bounds = textObj.getLocalBounds();
		const iconSize = 14;
		const iconGap = 6;
		const w = Math.ceil(bounds.width + padX * 2 + iconSize + iconGap);
		const h = Math.ceil(bounds.height + padY * 2);
		panel.drawRect(x, y, w, h);
		if (icon) {
			const res = drawPixelIcon(icon, ICONS[icon._iconKey], iconSize, accent);
			const ix = x + padX;
			const iy = y + Math.round((h - res.h) / 2);
			icon.position.set(ix, iy);
			icon._basePos = { x: ix, y: iy };
			textObj.position.set(x + padX + iconSize + iconGap, y + padY);
		} else {
			textObj.position.set(x + padX, y + padY);
		}
		return { w, h };
	}

	function layout() {
		updateText();
		const barHeight = 44;
		const margin = 10;
		const gap = 10;

		panel.clear();
		panel.beginFill(0x050d0b, 0.75);
		panel.lineStyle(1, accent, 0.6);
		panel.drawRect(0, 0, Math.max(200, app.renderer.width - margin * 2), barHeight);
		panel.endFill();

		let x = 12;
		const y = Math.round((barHeight - 22) / 2);
		header.position.set(x, Math.round((barHeight - header.height) / 2));
		x += header.width + 14;

		panel.beginFill(0x0a1b17, 0.9);
		panel.lineStyle(1, accent, 0.5);
		iconDate._iconKey = 'calendar';
		iconTime._iconKey = 'clock';
		iconWeather._iconKey = 'cloud';
		iconCity._iconKey = 'pin';
		let b = drawBadge(x, y, dateText, iconDate);
		x += b.w + gap;
		b = drawBadge(x, y, timeText, iconTime);
		x += b.w + gap;
		b = drawBadge(x, y, weatherText, iconWeather);
		x += b.w + gap;
		b = drawBadge(x, y, cityText, iconCity);
		panel.endFill();

		container.position.set(margin, margin);
	}

	function update(dt = 0) {
		updateText();
		iconState.t += dt / 60;
		const accel = Math.min(2.2, 0.6 + iconState.t * 0.18);
		for (const entry of iconState.base) {
			const wobble = Math.sin(iconState.t * 3.2 + entry.phase) * 0.4;
			const base = entry.icon._basePos;
			if (base) entry.icon.position.set(base.x, base.y + wobble);
			const blink = (Math.sin(iconState.t * 7.5 * accel + entry.phase) + 1) * 0.5;
			entry.icon.alpha = 0.25 + 0.75 * blink;
			entry.icon.scale.set(1.0);
		}
	}

	layout();

	return {
		container,
		layout,
		update,
	};
}
