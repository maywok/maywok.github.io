// Parallax background with tiled procedural textures (dots + diagonal stripes)
// Returns { container, update, resize }
export function createParallaxBackground(app, theme) {
  const container = new PIXI.Container();

  const t = theme || {
    // Dark mode defaults (current look)
    bg: 0x102a3f,
    dot: 0x0e2233,
    stripe: 0x143247,
    farAlpha: 0.10,
    midAlpha: 0.14,
    nearAlpha: 0.18,
  };

  function makeDotsTexture() {
    const g = new PIXI.Graphics();
  g.beginFill(t.dot, 0.25);
    const size = 128;
    for (let y = 4; y < size; y += 8) {
      for (let x = 4; x < size; x += 8) {
        g.drawCircle(x, y, 0.8);
      }
    }
    g.endFill();
    return app.renderer.generateTexture(g, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  function makeStripesTexture() {
    const g = new PIXI.Graphics();
    const size = 128;
  g.lineStyle(2, t.stripe, 0.35);
    for (let i = -size; i < size * 2; i += 12) {
      g.moveTo(i, -8);
      g.lineTo(i + size, size + 8);
    }
    return app.renderer.generateTexture(g, { scaleMode: PIXI.SCALE_MODES.NEAREST });
  }

  const texDots = makeDotsTexture();
  const texStripes = makeStripesTexture();

  const width = app.renderer.width;
  const height = app.renderer.height;

  const far = new PIXI.TilingSprite(texDots, width, height);
  far.alpha = t.farAlpha;

  const mid = new PIXI.TilingSprite(texStripes, width, height);
  mid.alpha = t.midAlpha;

  const near = new PIXI.TilingSprite(texDots, width, height);
  near.alpha = t.nearAlpha;

  container.addChild(far);
  container.addChild(mid);
  container.addChild(near);

  function update(time) {
    // Subtle drift for depth
    far.tilePosition.x = -time * 8;
    far.tilePosition.y = time * 2;
    mid.tilePosition.x = -time * 18;
    mid.tilePosition.y = time * 4;
    near.tilePosition.x = -time * 32;
    near.tilePosition.y = time * 6;
  }

  function resize() {
    far.width = mid.width = near.width = app.renderer.width;
    far.height = mid.height = near.height = app.renderer.height;
  }

  function destroy() {
    texDots?.destroy?.(true);
    texStripes?.destroy?.(true);
    container.destroy({ children: true });
  }

  return { container, update, resize, destroy };
}
