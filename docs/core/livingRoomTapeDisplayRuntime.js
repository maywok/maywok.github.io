export function updateLivingRoomTapeDisplayFrame(context, args = {}) {
	const {
		livingRoomTapes,
		livingRoomState,
		VIEW_TV_AREA,
		DEFAULT_NEON_ACCENT,
		livingRoomTapeW,
		livingRoomTapeH,
	} = context;
	const {
		reveal,
		focusMix,
		dtSeconds,
		pulseTime,
	} = args;
	const interactionsReady = reveal > 0.95 && livingRoomState.viewMode === VIEW_TV_AREA;
	for (let i = 0; i < livingRoomTapes.length; i++) {
		const tape = livingRoomTapes[i];
		const selected = livingRoomState.insertedTapeId && livingRoomState.insertedTapeId === tape.tape.id;
		tape.node.eventMode = interactionsReady ? 'static' : 'none';
		tape.node.cursor = interactionsReady ? 'pointer' : 'default';
		const targetHover = interactionsReady && livingRoomState.hoverIndex === i ? 1 : 0;
		const targetMix = Math.max(targetHover, selected ? 0.7 : 0);
		tape.hoverMix += (targetMix - tape.hoverMix) * Math.min(1, dtSeconds * 12);
		const h = Math.max(0, Math.min(1, tape.hoverMix));
		const pulse = 0.5 + 0.5 * Math.sin(pulseTime * 2.8 + i * 0.7);
		tape.node.position.set(tape.baseX + targetHover * 8, tape.baseY - h * 1.5);
		tape.node.scale.set(1 + h * 0.03);
		const tw = livingRoomTapeW;
		const th = livingRoomTapeH;
		tape.aura.clear();
		if (selected || targetHover > 0) {
			const glowAlpha = selected ? (0.08 + pulse * 0.12) : (0.04 + pulse * 0.07);
			const glowPad = 5 + pulse * 3;
			tape.aura.beginFill(tape.tape.accent || DEFAULT_NEON_ACCENT, glowAlpha);
			tape.aura.drawRoundedRect(-tw * 0.5 - glowPad, -th * 0.5 - glowPad, tw + glowPad * 2, th + glowPad * 2, 12 + pulse * 2);
			tape.aura.endFill();
		}
		tape.shadow.clear();
		tape.shadow.beginFill(0x000000, 0.16 + h * 0.08);
		tape.shadow.drawRoundedRect(-tw * 0.5 + 4, -th * 0.5 + 7, tw, th, 9);
		tape.shadow.endFill();
		tape.body.clear();
		tape.body.beginFill(0x1a2633, 0.98);
		const borderAlpha = selected ? (0.7 + pulse * 0.3) : (targetHover > 0 ? (0.42 + pulse * 0.18) : 0.28);
		tape.body.lineStyle(2, tape.tape.accent || DEFAULT_NEON_ACCENT, borderAlpha);
		tape.body.drawRoundedRect(-tw * 0.5, -th * 0.5, tw, th, 9);
		tape.body.endFill();
		tape.notch.clear();
		tape.notch.beginFill(0x2d3b4a, 0.95);
		tape.notch.drawRoundedRect(-tw * 0.15, -th * 0.5, tw * 0.3, th * 0.14, 4);
		tape.notch.endFill();
		tape.labelStrip.clear();
		tape.labelStrip.beginFill(0x22394b, 0.96);
		tape.labelStrip.lineStyle(1, 0x89d5ff, 0.34);
		tape.labelStrip.drawRoundedRect(-tw * 0.42, -th * 0.06, tw * 0.84, th * 0.38, 4);
		tape.labelStrip.endFill();
		const badgeW = th * 0.44;
		const badgeH = th * 0.44;
		const badgeX = -tw * 0.28;
		const badgeY = -th * 0.02;
		tape.badge.clear();
		tape.badge.beginFill(0x182437, 0.96);
		tape.badge.drawRoundedRect(badgeX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
		tape.badge.endFill();
		tape.badge.beginFill(0x35587d, 0.38);
		tape.badge.drawPolygon([
			badgeX - badgeW * 0.44, badgeY - badgeH * 0.4,
			badgeX + badgeW * 0.24, badgeY - badgeH * 0.4,
			badgeX - badgeW * 0.18, badgeY + badgeH * 0.42,
			badgeX - badgeW * 0.44, badgeY + badgeH * 0.42,
		]);
		tape.badge.endFill();
		tape.badge.lineStyle(1.4, tape.tape.accent || DEFAULT_NEON_ACCENT, 0.85);
		tape.badge.drawRoundedRect(badgeX - badgeW * 0.5, badgeY - badgeH * 0.5, badgeW, badgeH, 6);
		tape.badgeSpec.clear();
		tape.badgeSpec.beginFill(0xd8f2ff, 0.18);
		tape.badgeSpec.drawRoundedRect(badgeX - badgeW * 0.32, badgeY - badgeH * 0.34, badgeW * 0.64, badgeH * 0.14, 2);
		tape.badgeSpec.endFill();
		tape.art.position.set(badgeX, badgeY);
		tape.art.width = badgeW * 0.82;
		tape.art.height = badgeH * 0.82;
		tape.art.alpha = 0.78 + focusMix * 0.16;
		tape.screws.clear();
		tape.screws.beginFill(0x7da1bb, 0.92);
		tape.screws.drawCircle(-tw * 0.41, -th * 0.39, 2.1);
		tape.screws.drawCircle(tw * 0.41, -th * 0.39, 2.1);
		tape.screws.drawCircle(-tw * 0.41, th * 0.39, 2.1);
		tape.screws.drawCircle(tw * 0.41, th * 0.39, 2.1);
		tape.screws.endFill();
		tape.shellHighlight.clear();
		tape.shellHighlight.lineStyle(1.5, 0xb5e7ff, 0.65);
		tape.shellHighlight.moveTo(-tw * 0.46, -th * 0.45);
		tape.shellHighlight.lineTo(tw * 0.46, -th * 0.45);
		tape.shellHighlight.moveTo(-tw * 0.46, -th * 0.45);
		tape.shellHighlight.lineTo(-tw * 0.46, th * 0.45);
		tape.shellShadow.clear();
		tape.shellShadow.lineStyle(1.5, 0x081018, 0.75);
		tape.shellShadow.moveTo(-tw * 0.46, th * 0.45);
		tape.shellShadow.lineTo(tw * 0.46, th * 0.45);
		tape.shellShadow.moveTo(tw * 0.46, -th * 0.45);
		tape.shellShadow.lineTo(tw * 0.46, th * 0.45);
		tape.title.position.set(tw * (0.12 - focusMix * 0.06), th * 0.12);
		const compactLabel = tape.tape.label.length > 7 ? `${tape.tape.label.slice(0, 7)}...` : tape.tape.label;
		tape.title.text = focusMix > 0.58 ? compactLabel : tape.tape.label;
		tape.title.alpha = selected ? 1 : (0.94 - focusMix * 0.22);
		tape.title.style.fill = selected ? 0xf0fbff : 0xd0dce8;
		tape.title.style.fontSize = Math.max(10, Math.round(th * (0.28 - focusMix * 0.05)));
		tape.node.alpha = 0.16 + reveal * 0.84;
	}
}

export function createLivingRoomTapeDisplayController(context) {
	const baseContext = { ...context };
	return {
		step(args = {}) {
			const {
				livingRoomTapeW = baseContext.livingRoomTapeW,
				livingRoomTapeH = baseContext.livingRoomTapeH,
				...frameArgs
			} = args;
			return updateLivingRoomTapeDisplayFrame({
				...baseContext,
				livingRoomTapeW,
				livingRoomTapeH,
			}, frameArgs);
		},
	};
}
