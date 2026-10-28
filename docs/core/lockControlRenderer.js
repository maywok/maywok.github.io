export function drawLockControlVisual(context) {
	const {
		PIXI,
		lockHover,
		lockAnim,
		lockGlow,
		lockBg,
		lockIcon,
		lockButtonSize,
		lockToggle,
	} = context;

	const hover = Math.max(0, Math.min(1, lockHover));
	const unlocked = Math.max(0, Math.min(1, lockAnim));
	const borderAlpha = 0.58 + hover * 0.34;
	const glowAlpha = hover * 0.2;

	lockGlow.clear();
	lockGlow.beginFill(0xffffff, glowAlpha);
	lockGlow.drawRoundedRect(-4, -4, lockButtonSize + 8, lockButtonSize + 8, 14);
	lockGlow.endFill();

	lockBg.clear();
	lockBg.beginFill(0x050d0b, 0.9);
	lockBg.lineStyle(1, 0x22f3c8, borderAlpha);
	lockBg.drawRoundedRect(0, 0, lockButtonSize, lockButtonSize, 12);
	lockBg.endFill();

	lockIcon.clear();
	lockIcon.beginFill(0xffffff, 1);
	lockIcon.drawRoundedRect(15, 23, 22, 17, 4);
	lockIcon.endFill();
	lockIcon.beginFill(0x050d0b, 0.95);
	lockIcon.drawCircle(26, 30, 2.1);
	lockIcon.drawRoundedRect(25.3, 31.4, 1.4, 4.2, 0.8);
	lockIcon.endFill();

	const shackleLeftBaseX = 20 + unlocked * 7;
	const shackleLeftBaseY = 23 - unlocked * 6;
	const shackleRightBaseX = 32;
	const shackleTopY = 16;
	lockIcon.lineStyle({
		width: 3,
		color: 0xffffff,
		alpha: 1,
		cap: PIXI.LINE_CAP.ROUND,
		join: PIXI.LINE_JOIN.ROUND,
	});
	lockIcon.moveTo(shackleLeftBaseX, shackleLeftBaseY);
	lockIcon.lineTo(shackleLeftBaseX, shackleTopY + 1.5);
	lockIcon.quadraticCurveTo(26, 9.5, shackleRightBaseX, shackleTopY + 1.5);
	lockIcon.lineTo(shackleRightBaseX, 23);

	lockToggle.scale.set(1 + hover * 0.04);
	lockToggle.pivot.set((lockButtonSize * lockToggle.scale.x - lockButtonSize) * 0.5, (lockButtonSize * lockToggle.scale.y - lockButtonSize) * 0.5);

	return { lockNeedsRedraw: false };
}
