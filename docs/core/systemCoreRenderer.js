export function drawSystemCoreClock(context, args = {}) {
	const {
		PIXI,
		getCoreWorldPos,
		systemCore,
		ringSpinVel,
		coreHoverAmount,
		ringSpinInput,
		screenToWorldSize,
		CORE_BASE_HALF_SIZE,
		CORE_CLOCK_SCALE,
		hsvToRgbInt,
		coreDialGlow,
		coreDial,
		coreTickMarks,
		coreNum12,
		coreNum3,
		coreNum6,
		coreNum9,
		coreSecondTrail,
		coreHourHand,
		coreMinuteHand,
		coreSecondHand,
		coreSpinCue,
		coreGhost,
	} = context;
	const { time = 0 } = args;

	const p = getCoreWorldPos();
	systemCore.position.set(p.x, p.y);
	const spinEnergy = Math.min(1, Math.abs(ringSpinVel) * 0.22);
	const activeBoost = Math.max(coreHoverAmount, ringSpinInput?.isDragging?.() ? 1 : 0, spinEnergy);
	const pulse = 0.72 + 0.28 * Math.sin(time * 1.6);
	const dialHalf = screenToWorldSize(CORE_BASE_HALF_SIZE * CORE_CLOCK_SCALE);
	const markerR = dialHalf - screenToWorldSize(8);
	const now = new Date();
	const h = now.getHours() % 12;
	const m = now.getMinutes();
	const s = now.getSeconds();
	const ms = now.getMilliseconds();
	const secTick = Math.min(1, ms / 180);
	const secEase = secTick * secTick * (3 - 2 * secTick);
	const secondUnits = s + secEase;
	const minuteUnits = m + s / 60 + ms / 60000;
	const hourUnits = h + minuteUnits / 60;
	const secondAngle = secondUnits / 60 * Math.PI * 2 - Math.PI * 0.5;
	const minuteAngle = minuteUnits / 60 * Math.PI * 2 - Math.PI * 0.5;
	const hourAngle = hourUnits / 12 * Math.PI * 2 - Math.PI * 0.5;
	const rgbHue = (time * 0.035) % 1;
	const rgbA = hsvToRgbInt(rgbHue, 0.82, 1.0);
	const rgbB = hsvToRgbInt((rgbHue + 0.2) % 1, 0.78, 1.0);
	const rgbC = hsvToRgbInt((rgbHue + 0.52) % 1, 0.86, 1.0);
	const rgbSoft = hsvToRgbInt((rgbHue + 0.07) % 1, 0.45, 0.95);
	const dialGlowPad = screenToWorldSize(9);
	coreDialGlow.clear();
	coreDialGlow.beginFill(0xff5fa8, (0.08 + activeBoost * 0.1) * pulse);
	coreDialGlow.drawRoundedRect(-dialHalf - dialGlowPad, -dialHalf - dialGlowPad, (dialHalf + dialGlowPad) * 2, (dialHalf + dialGlowPad) * 2, screenToWorldSize(10));
	coreDialGlow.endFill();
	coreDialGlow.beginFill(0x71f0ff, (0.05 + activeBoost * 0.07) * pulse);
	coreDialGlow.drawRoundedRect(-dialHalf - dialGlowPad * 1.6, -dialHalf - dialGlowPad * 1.6, (dialHalf + dialGlowPad * 1.6) * 2, (dialHalf + dialGlowPad * 1.6) * 2, screenToWorldSize(12));
	coreDialGlow.endFill();

	coreDial.clear();
	coreDial.beginFill(0x0b1118, (0.9 + 0.06 * pulse));
	coreDial.drawRoundedRect(-dialHalf, -dialHalf, dialHalf * 2, dialHalf * 2, screenToWorldSize(7));
	coreDial.endFill();
	coreDial.lineStyle(3.1, rgbC, 0.66 + activeBoost * 0.3);
	coreDial.drawRoundedRect(-dialHalf + screenToWorldSize(2), -dialHalf + screenToWorldSize(2), (dialHalf - screenToWorldSize(2)) * 2, (dialHalf - screenToWorldSize(2)) * 2, screenToWorldSize(6));
	coreDial.lineStyle(2.1, rgbSoft, 0.5 + activeBoost * 0.24);
	coreDial.drawRoundedRect(-dialHalf + screenToWorldSize(5), -dialHalf + screenToWorldSize(5), (dialHalf - screenToWorldSize(5)) * 2, (dialHalf - screenToWorldSize(5)) * 2, screenToWorldSize(5));

	coreTickMarks.clear();
	for (let i = 0; i < 12; i++) {
		if (i % 3 === 0) continue;
		const a = (Math.PI * 2 * i) / 12 - Math.PI * 0.5;
		const x = Math.cos(a) * markerR;
		const y = Math.sin(a) * markerR;
		coreTickMarks.beginFill(rgbSoft, 0.72);
		coreTickMarks.drawCircle(x, y, screenToWorldSize(1.9));
		coreTickMarks.endFill();
	}
	const numeralR = markerR - screenToWorldSize(9);
	coreNum12.position.set(0, -numeralR);
	coreNum3.position.set(numeralR, 0);
	coreNum6.position.set(0, numeralR);
	coreNum9.position.set(-numeralR, 0);
	coreNum12.tint = rgbC;
	coreNum3.tint = rgbA;
	coreNum6.tint = rgbB;
	coreNum9.tint = rgbSoft;
	coreNum12.alpha = 0.96;
	coreNum3.alpha = 0.96;
	coreNum6.alpha = 0.96;
	coreNum9.alpha = 0.96;

	coreSecondTrail.clear();
	const secTrailR = markerR - screenToWorldSize(4);
	coreSecondTrail.lineStyle(1.4, rgbC, 0.32 + activeBoost * 0.34);
	coreSecondTrail.arc(0, 0, secTrailR, secondAngle - 0.45, secondAngle);

	const hourLen = markerR - screenToWorldSize(18);
	const minuteLen = markerR - screenToWorldSize(9);
	const secondLen = markerR - screenToWorldSize(4);
	const hourX = Math.cos(hourAngle) * hourLen;
	const hourY = Math.sin(hourAngle) * hourLen;
	const minuteX = Math.cos(minuteAngle) * minuteLen;
	const minuteY = Math.sin(minuteAngle) * minuteLen;
	const secondX = Math.cos(secondAngle) * secondLen;
	const secondY = Math.sin(secondAngle) * secondLen;

	coreHourHand.clear();
	coreHourHand.lineStyle({ width: screenToWorldSize(5.2), color: rgbA, alpha: 0.9, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
	coreHourHand.moveTo(0, 0);
	coreHourHand.lineTo(hourX, hourY);
	coreHourHand.lineStyle({ width: screenToWorldSize(1.5), color: rgbSoft, alpha: 0.78, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
	coreHourHand.moveTo(0, 0);
	coreHourHand.lineTo(hourX * 0.84, hourY * 0.84);

	coreMinuteHand.clear();
	coreMinuteHand.lineStyle({ width: screenToWorldSize(3.8), color: rgbB, alpha: 0.96, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
	coreMinuteHand.moveTo(0, 0);
	coreMinuteHand.lineTo(minuteX, minuteY);

	coreSecondHand.clear();
	coreSecondHand.lineStyle({ width: screenToWorldSize(2), color: rgbC, alpha: 0.98, cap: PIXI.LINE_CAP.ROUND, join: PIXI.LINE_JOIN.ROUND });
	coreSecondHand.moveTo(-Math.cos(secondAngle) * screenToWorldSize(10), -Math.sin(secondAngle) * screenToWorldSize(10));
	coreSecondHand.lineTo(secondX, secondY);
	coreSecondHand.beginFill(rgbC, 0.95);
	coreSecondHand.drawCircle(0, 0, screenToWorldSize(3.8));
	coreSecondHand.endFill();
	coreSecondHand.lineStyle(1.2, rgbSoft, 0.7);
	coreSecondHand.drawCircle(0, 0, screenToWorldSize(3.8));
	coreSecondHand.beginFill(rgbA, 0.88);
	coreSecondHand.drawCircle(secondX, secondY, screenToWorldSize(2.8));
	coreSecondHand.endFill();

	coreSpinCue.clear();

	coreGhost.width = screenToWorldSize(34);
	coreGhost.height = screenToWorldSize(34);
	coreGhost.tint = rgbA;
	coreGhost.alpha = 0.76 + activeBoost * 0.18;
}
