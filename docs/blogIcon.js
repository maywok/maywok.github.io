export async function createBlogIcon(app, world, options = {}) {
	const {
		url = '/blog',
		frozenJsonUrl = './assets/spritesheet/json/frozenMug.json',
		hoverJsonUrl = './assets/spritesheet/json/hoverMug.json',
		frozenImageUrl = './assets/spritesheet/frozenMug.png',
		hoverImageUrl = './assets/spritesheet/hoverMug.png',
		margin = 24,
		animationSpeed = 0.12,
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

	const [frozenData, hoverData] = await Promise.all([
		fetch(frozenJsonUrl).then((r) => r.json()),
		fetch(hoverJsonUrl).then((r) => r.json()),
	]);
	await PIXI.Assets.load([frozenImageUrl, hoverImageUrl]);

	const frozenTextures = buildTextures(frozenData, frozenImageUrl);
	const hoverTextures = buildTextures(hoverData, hoverImageUrl);
	const frozenSprite = new PIXI.AnimatedSprite(frozenTextures);
	const hoverSprite = new PIXI.AnimatedSprite(hoverTextures);
	frozenSprite.anchor.set(0.5);
	hoverSprite.anchor.set(0.5);
	frozenSprite.animationSpeed = animationSpeed;
	hoverSprite.animationSpeed = animationSpeed;
	frozenSprite.gotoAndStop(0);
	hoverSprite.visible = false;
	hoverSprite.stop();

	const container = new PIXI.Container();
	container.addChild(frozenSprite);
	container.addChild(hoverSprite);
	container.eventMode = 'static';
	container.cursor = 'pointer';
	container.on('pointerover', () => {
		frozenSprite.visible = false;
		hoverSprite.visible = true;
		hoverSprite.play();
	});
	container.on('pointerout', () => {
		hoverSprite.stop();
		hoverSprite.visible = false;
		frozenSprite.visible = true;
		frozenSprite.gotoAndStop(0);
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

	return { container, layout };
}
