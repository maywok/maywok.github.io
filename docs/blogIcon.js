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
		backgroundWidth = 84,
		backgroundHeight = 108,
		backgroundCornerRadius = 12,
		margin = 24,
		animationSpeed = 0.12,
		scale = 5,
		parallaxOffset = 6,
		backgroundParallax = 3,
		tiltAmount = 0.12,
		foilStrength = 0.18,
		foilStrengthMax = 0.42,
		enableFoil = false,
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
	backgroundSprite.width = backgroundWidth;
	backgroundSprite.height = backgroundHeight;
	const backgroundMask = new PIXI.Graphics();
	backgroundMask.beginFill(0xffffff, 1);
	backgroundMask.drawRoundedRect(-backgroundWidth / 2, -backgroundHeight / 2, backgroundWidth, backgroundHeight, backgroundCornerRadius);
	backgroundMask.endFill();
	backgroundSprite.mask = backgroundMask;
	let foilSprite = null;
	let foilUniforms = null;
	if (enableFoil) {
		foilSprite = new PIXI.Sprite(PIXI.Texture.WHITE);
		foilSprite.anchor.set(0.5);
		foilSprite.width = backgroundWidth;
		foilSprite.height = backgroundHeight;
		foilSprite.alpha = foilStrength;
		foilSprite.blendMode = PIXI.BLEND_MODES.SCREEN;
		foilSprite.mask = backgroundMask;
		foilUniforms = {
			u_time: 0,
			u_offset: new Float32Array([0, 0]),
		};
		const foilFilter = new PIXI.Filter(undefined, `
			precision mediump float;
			varying vec2 vTextureCoord;
			uniform float u_time;
			uniform vec2 u_offset;
			vec3 rainbow(float t) {
				return 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));
			}
			void main() {
				vec2 uv = vTextureCoord + u_offset;
				float wave = sin((uv.x * 4.0 + uv.y * 3.0 + u_time * 1.2)) * 0.5 + 0.5;
				vec3 col = rainbow(uv.x * 0.8 + uv.y * 0.6 + u_time * 0.25);
				gl_FragColor = vec4(col * wave, 1.0);
			}
		` , foilUniforms);
		foilSprite.filters = [foilFilter];
	}
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
	container.addChild(backgroundSprite);
	container.addChild(backgroundMask);
	if (foilSprite) container.addChild(foilSprite);
	container.addChild(frozenSprite);
	container.addChild(hoverSprite);
	container.scale.set(scale);
	const motionLayers = [
		{ target: hoverSprite, strength: parallaxOffset },
		{ target: backgroundSprite, strength: backgroundParallax, invert: true },
	];
	if (foilSprite) {
		motionLayers.push({ target: foilSprite, strength: backgroundParallax + 1, invert: true });
	}
	const cardMotion = createCardMotion(container, {
		width: backgroundWidth,
		height: backgroundHeight,
		tiltAmount,
		layers: motionLayers,
	});
	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		frozenSprite.visible = false;
		hoverSprite.visible = true;
		hoverSprite.gotoAndPlay(0);
	});
	container.on('pointermove', (event) => {
		if (!hoverSprite.visible) return;
		cardMotion.onPointerMove(event);
		const local = event.getLocalPosition(container);
		const nx = Math.max(-1, Math.min(1, local.x / (backgroundWidth / 2 || 1)));
		const ny = Math.max(-1, Math.min(1, local.y / (backgroundHeight / 2 || 1)));
		if (foilSprite && foilUniforms) {
			foilUniforms.u_offset[0] = nx * 0.08;
			foilUniforms.u_offset[1] = ny * 0.08;
			const tiltMag = Math.min(1, Math.hypot(nx, ny));
			foilSprite.alpha = foilStrength + (foilStrengthMax - foilStrength) * tiltMag;
		}
	});
	container.on('pointerout', () => {
		hoverSprite.stop();
		hoverSprite.visible = false;
		frozenSprite.visible = true;
		frozenSprite.play();
		cardMotion.reset();
		if (foilSprite && foilUniforms) {
			foilUniforms.u_offset[0] = 0;
			foilUniforms.u_offset[1] = 0;
			foilSprite.alpha = foilStrength;
		}
	});
	container.on('pointertap', () => {
		window.open(url, '_blank', 'noopener');
	});

	function layout() {
		const bounds = container.getLocalBounds();
		const w = bounds.width * container.scale.x;
		const h = bounds.height * container.scale.y;
		container.position.set(
			app.renderer.width - margin - w / 2,
			app.renderer.height - margin - h / 2,
		);
	}

	world.addChild(container);
	layout();
	app.ticker.add((dt) => {
		if (foilUniforms) foilUniforms.u_time += dt / 60;
		cardMotion.update();
	});

	return { container, layout };
}
