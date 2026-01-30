export function createSystemHud(app, options = {}) {
	const {
		pixelFont = 'Minecraft, monospace',
		city = 'SEATTLE, WA',
		weather = 'CLEAR 72°F',
		accent = 0x22f3c8,
	} = options;

	const container = new PIXI.Container();
	container.eventMode = 'none';

	const panel = new PIXI.Graphics();
	const header = new PIXI.Text('SYSTEM INFO', {
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

	container.addChild(panel, header, dateText, timeText, weatherText, cityText);
	app.stage.addChild(container);

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

	function layout() {
		updateText();
		const padX = 12;
		const padY = 10;
		const gap = 6;

		header.position.set(padX, padY);
		dateText.position.set(padX, header.y + header.height + gap);
		timeText.position.set(padX, dateText.y + dateText.height + gap);
		weatherText.position.set(padX, timeText.y + timeText.height + gap);
		cityText.position.set(padX, weatherText.y + weatherText.height + gap);

		const bounds = cityText.getLocalBounds();
		const width = Math.max(
			header.width,
			dateText.width,
			timeText.width,
			weatherText.width,
			cityText.width,
		) + padX * 2;
		const height = cityText.y + bounds.height + padY;

		panel.clear();
		panel.beginFill(0x050d0b, 0.65);
		panel.lineStyle(1, accent, 0.6);
		panel.drawRoundedRect(0, 0, Math.ceil(width), Math.ceil(height), 8);
		panel.endFill();

		container.position.set(
			Math.max(12, app.renderer.width - width - 18),
			12,
		);
	}

	function update() {
		updateText();
	}

	layout();

	return {
		container,
		layout,
		update,
	};
}
