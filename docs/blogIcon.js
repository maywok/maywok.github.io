import { createCardMotion } from './cardMotion.js';

export async function createBlogIcon(app, world, options = {}) {
	const {
		url = '/blog',
		frozenJsonUrl = './assets/spritesheet/json/frozenMug.json',
		hoverJsonUrl = './assets/spritesheet/json/hoverMug.json',
		frozenImageUrl = './assets/spritesheet/frozenMug.png',
		hoverImageUrl = './assets/spritesheet/hoverMug.png',
		backgroundUrl = './assets/images/background.gif',
		backgroundJsonUrl = null,
		backgroundWidth = 76,
		backgroundHeight = 76,
		backgroundCornerRadius = 12,
		margin = 24,
		animationSpeed = 0.12,
		scale = 4.6,
		parallaxOffset = 6,
		backgroundParallax = 3,
		tiltAmount = 0.12,
		screenScale = 1,
		label = 'Blog',
		pixelFont = 'Minecraft, monospace',
		panelFill = 0x0b1b1a,
		panelFillAlpha = 0.22,
		panelBorder = 0x22f3c8,
		panelBorderAlpha = 0.55,
		previewWidth = 150,
		previewHeight = 96,
		previewCornerRadius = 10,
		previewOffsetX = -170,
		previewOffsetY = -80,
	} = options;

	function extractFrameIndex(name) {
		const match = name.match(/(\d+)(?!.*\d)/);
		return match ? Number(match[1]) : 0;
	}

	function buildTextures(data, imageUrl) {
		const baseTexture = PIXI.BaseTexture.from(imageUrl);
		const frames = Object.entries(data.frames || {}).map(([name, value]) => ({
			name,
			frame: value.frame,
		}));
		frames.sort((a, b) => extractFrameIndex(a.name) - extractFrameIndex(b.name));
		return frames.map(({ frame }) => new PIXI.Texture(
			baseTexture,
			new PIXI.Rectangle(frame.x, frame.y, frame.w, frame.h),
		));
	}

	const [frozenData, hoverData, backgroundData] = await Promise.all([
		fetch(frozenJsonUrl).then((r) => r.json()),
		fetch(hoverJsonUrl).then((r) => r.json()),
		backgroundJsonUrl ? fetch(backgroundJsonUrl).then((r) => r.json()) : Promise.resolve(null),
	]);
	await PIXI.Assets.load([frozenImageUrl, hoverImageUrl, backgroundUrl]);

	const frozenTextures = buildTextures(frozenData, frozenImageUrl);
	const hoverTextures = buildTextures(hoverData, hoverImageUrl);
	let backgroundSprite = null;
	if (backgroundData) {
		const backgroundTextures = buildTextures(backgroundData, backgroundUrl);
		const animatedBg = new PIXI.AnimatedSprite(backgroundTextures);
		animatedBg.animationSpeed = animationSpeed;
		animatedBg.play();
		backgroundSprite = animatedBg;
	} else {
		backgroundSprite = new PIXI.Sprite(PIXI.Texture.from(backgroundUrl));
	}
	backgroundSprite.anchor.set(0.5);
	backgroundSprite.width = previewWidth;
	backgroundSprite.height = previewHeight;
	const frozenSprite = new PIXI.AnimatedSprite(frozenTextures);
	const hoverSprite = new PIXI.AnimatedSprite(hoverTextures);
	frozenSprite.anchor.set(0.5);
	hoverSprite.anchor.set(0.5);
	frozenSprite.animationSpeed = animationSpeed;
	hoverSprite.animationSpeed = animationSpeed;
	frozenSprite.play();
	hoverSprite.visible = false;
	hoverSprite.stop();

	const container = new PIXI.Container();
	const panel = new PIXI.Graphics();
	const panelBorderGraphic = new PIXI.Graphics();
	const labelText = new PIXI.Text(label, {
		fontFamily: pixelFont,
		fontSize: 12,
		fill: 0xeafbff,
		align: 'center',
		letterSpacing: 1,
	});
	labelText.anchor.set(0.5, 0);

	function drawPanel() {
		panel.clear();
		panel.beginFill(panelFill, panelFillAlpha);
		panel.drawRoundedRect(-backgroundWidth / 2, -backgroundHeight / 2, backgroundWidth, backgroundHeight, backgroundCornerRadius);
		panel.endFill();
		panelBorderGraphic.clear();
		panelBorderGraphic.lineStyle(1.5, panelBorder, panelBorderAlpha);
		panelBorderGraphic.drawRoundedRect(-backgroundWidth / 2 + 1, -backgroundHeight / 2 + 1, backgroundWidth - 2, backgroundHeight - 2, Math.max(4, backgroundCornerRadius - 2));
		labelText.position.set(0, backgroundHeight / 2 + 6);
	}
	drawPanel();

	container.addChild(panel, panelBorderGraphic, frozenSprite, hoverSprite, labelText);
	container.scale.set(scale);
	const motionLayers = [
		{ target: hoverSprite, strength: parallaxOffset },
	];
	const cardMotion = createCardMotion(container, {
		width: backgroundWidth,
		height: backgroundHeight,
		tiltAmount,
		layers: motionLayers,
	});

	const preview = new PIXI.Container();
	const previewBg = new PIXI.Graphics();
	const previewBorder = new PIXI.Graphics();
	const previewMask = new PIXI.Graphics();
	const previewTitle = new PIXI.Text('Blog Preview', {
		fontFamily: pixelFont,
		fontSize: 11,
		fill: 0xeafbff,
		align: 'center',
		letterSpacing: 1,
	});
	previewTitle.anchor.set(0.5, 0.5);
	previewMask.beginFill(0xffffff, 1);
	previewMask.drawRoundedRect(-previewWidth / 2, -previewHeight / 2 + 10, previewWidth, previewHeight - 18, previewCornerRadius);
	previewMask.endFill();
	backgroundSprite.mask = previewMask;
	backgroundSprite.position.set(0, 8);

	previewBg.beginFill(panelFill, 0.38);
	previewBg.drawRoundedRect(-previewWidth / 2, -previewHeight / 2, previewWidth, previewHeight, previewCornerRadius);
	previewBg.endFill();
	previewBorder.lineStyle(1.5, panelBorder, 0.45);
	previewBorder.drawRoundedRect(-previewWidth / 2 + 1, -previewHeight / 2 + 1, previewWidth - 2, previewHeight - 2, Math.max(4, previewCornerRadius - 2));
	previewTitle.position.set(0, -previewHeight / 2 + 10);

	preview.addChild(previewBg, previewBorder, previewTitle, backgroundSprite, previewMask);
	preview.visible = false;
	preview.alpha = 0;
	preview.scale.set(0.96);
	preview.eventMode = 'none';
	world.addChild(preview);
	const state = {
		hovered: false,
		base: { x: 0, y: 0 },
		previewAlpha: 0,
		previewTarget: 0,
		currentScale: scale,
	};

	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		state.hovered = true;
		state.previewTarget = 1;
		preview.visible = true;
		frozenSprite.visible = false;
		hoverSprite.visible = true;
		hoverSprite.gotoAndPlay(0);
	});
	container.on('pointermove', (event) => {
		if (!hoverSprite.visible) return;
		cardMotion.onPointerMove(event);
	});
	container.on('pointerout', () => {
		state.hovered = false;
		state.previewTarget = 0;
		hoverSprite.stop();
		hoverSprite.visible = false;
		frozenSprite.visible = true;
		frozenSprite.play();
		cardMotion.reset();
	});
	container.on('pointertap', () => {
		window.open(url, '_blank', 'noopener');
	});

	function layout() {
		const bounds = container.getLocalBounds();
		const w = bounds.width * container.scale.x;
		const h = bounds.height * container.scale.y;
		const screenX = app.renderer.width - margin - w / 2;
		const screenY = app.renderer.height - margin - h / 2;
		const cx = app.renderer.width / 2;
		const cy = app.renderer.height / 2;
		const worldX = (screenX - cx) / screenScale + cx;
		const worldY = (screenY - cy) / screenScale + cy;
		state.base.x = worldX;
		state.base.y = worldY;
		container.position.set(worldX, worldY);
		preview.position.set(worldX + previewOffsetX / screenScale, worldY + previewOffsetY / screenScale);
	}

	world.addChild(container);
	layout();
	app.ticker.add((dt) => {
		cardMotion.update();
		const targetScale = state.hovered ? scale * 1.05 : scale;
		state.currentScale += (targetScale - state.currentScale) * 0.18 * dt;
		container.scale.set(state.currentScale);
		const popOut = state.hovered ? 4 / screenScale : 0;
		container.position.set(state.base.x, state.base.y - popOut);
		preview.position.set(state.base.x + previewOffsetX / screenScale, state.base.y + previewOffsetY / screenScale - popOut);
		state.previewAlpha += (state.previewTarget - state.previewAlpha) * 0.12 * dt;
		preview.alpha = state.previewAlpha;
		preview.scale.set(0.96 + 0.04 * state.previewAlpha);
		if (state.previewAlpha <= 0.02 && !state.previewTarget) {
			preview.visible = false;
		}
	});

	return { container, layout };
}
