export function createSystemHud(app, options = {}) {
	const {
		pixelFont = 'Minecraft, monospace',
		status = 'ONLINE',
		nowPlaying = 'CRIMSON FLOW',
		location = 'EARTH',
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

	const timeText = new PIXI.Text('', lineStyle);
	const statusText = new PIXI.Text('', lineStyle);
	const nowText = new PIXI.Text('', lineStyle);
	const locationText = new PIXI.Text('', lineStyle);

	container.addChild(panel, header, timeText, statusText, nowText, locationText);
	app.stage.addChild(container);

	let lastTimeLabel = '';

	function formatTime() {
		const now = new Date();
		return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function updateText() {
		const timeLabel = `TIME ${formatTime()}`;
		if (timeLabel !== lastTimeLabel) {
			lastTimeLabel = timeLabel;
			timeText.text = timeLabel;
		}
		statusText.text = `STATUS ${status}`;
		nowText.text = `NOW PLAYING ${nowPlaying}`;
		locationText.text = `LOCATION ${location}`;
	}

	function layout() {
		updateText();
		const padX = 12;
		const padY = 10;
		const gap = 6;

		header.position.set(padX, padY);
		timeText.position.set(padX, header.y + header.height + gap);
		statusText.position.set(padX, timeText.y + timeText.height + gap);
		nowText.position.set(padX, statusText.y + statusText.height + gap);
		locationText.position.set(padX, nowText.y + nowText.height + gap);

		const bounds = locationText.getLocalBounds();
		const width = Math.max(
			header.width,
			timeText.width,
			statusText.width,
			nowText.width,
			locationText.width,
		) + padX * 2;
		const height = locationText.y + bounds.height + padY;

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
