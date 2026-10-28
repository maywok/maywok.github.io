export function createLivingRoomTerminalTypingController(options = {}) {
	const {
		PIXI,
		PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
		PORTFOLIO_HIGHLIGHT_ACCENT,
		PORTFOLIO_HIGHLIGHT_RAINBOW,
		TERMINAL_TYPE_RATE,
		TERMINAL_BASE_COLOR,
		TERMINAL_LABEL_COLORS,
		TERMINAL_LINK_COLOR,
		TERMINAL_ACCENT_COLOR,
		TERMINAL_RAINBOW_FILL,
		TERMINAL_AERO_WAVE_TEXT,
		TERMINAL_AERO_WAVE_SEA_BLUE,
		TERMINAL_AERO_WAVE_LIGHT_PURPLE,
		TERMINAL_AERO_WAVE_AMPLITUDE,
		TERMINAL_AERO_WAVE_SPEED,
		TERMINAL_AERO_WAVE_COLOR_SPEED,
		TERMINAL_AERO_HIDE_COLOR,
		mixColors,
		livingRoomTerminalLayout,
		tvTerminalLines,
		tvTerminalCursor,
		tvTerminalOverviewText,
		tvTerminalDesignWaveCover,
		tvTerminalDesignWave,
		tvTerminalDesignWaveMask,
		tvTerminalDesignText,
		destroyContainerChildren,
		getTvTerminalStartX = () => 0,
		getTvTerminalStartY = () => 0,
		getTvTerminalLineHeight = () => 1,
		getTvTerminalFontSize = () => 12,
		getTerminalTypingHold = () => false,
	} = options;

	let terminalFullText = '';
	let terminalTypedIndex = 0;
	let terminalTypeTimer = 0;
	let terminalRenderedSnapshot = '';
	let terminalCursorBlinkTimer = 0;
	let terminalSourceKey = '';
	let terminalOverviewFullText = '';
	let terminalOverviewTypedIndex = 0;
	let terminalOverviewTypeTimer = 0;
	let terminalOverviewSourceKey = '';
	let terminalKeywordRules = [];
	let terminalLinkLabelSet = new Set();
	let terminalDesignWaveGlyphs = [];

	const dedupeKeywordRules = (rules) => {
		const seen = new Set();
		const output = [];
		for (const rule of rules) {
			if (!rule?.text) continue;
			const key = rule.text.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			output.push({
				text: rule.text,
				style: rule.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? PORTFOLIO_HIGHLIGHT_RAINBOW : PORTFOLIO_HIGHLIGHT_ACCENT,
			});
		}
		return output.sort((a, b) => b.text.length - a.text.length);
	};

	const renderTerminalTypedText = (force = false) => {
		const typedText = terminalFullText.slice(0, terminalTypedIndex);
		if (!force && terminalRenderedSnapshot === typedText) return;
		terminalRenderedSnapshot = typedText;
		destroyContainerChildren(tvTerminalLines);
		const tvTerminalFontSize = getTvTerminalFontSize();
		const tvTerminalStartX = getTvTerminalStartX();
		const tvTerminalStartY = getTvTerminalStartY();
		const tvTerminalLineHeight = getTvTerminalLineHeight();
		const measureTerminalWidth = (sampleText) => {
			const text = String(sampleText || '');
			if (!text) return 0;
			return text.length * (tvTerminalFontSize * 0.62 + 0.8);
		};
		const wrapTypedLine = (lineText, maxWidth) => {
			const raw = String(lineText || '');
			if (!raw) return [''];
			if (measureTerminalWidth(raw) <= maxWidth) return [raw];
			const leading = raw.match(/^\s+/)?.[0] || '';
			const words = raw.trim().split(/\s+/).filter(Boolean);
			if (!words.length) return [raw];
			const continuationLeading = (!leading && /:$/.test(words[0])) ? '  ' : leading;
			const linesOut = [];
			let line = leading;
			for (const word of words) {
				const prefix = line.trim().length ? ' ' : '';
				const candidate = `${line}${prefix}${word}`;
				if (measureTerminalWidth(candidate) <= maxWidth || !line.trim().length) {
					line = candidate;
					continue;
				}
				linesOut.push(line);
				line = `${continuationLeading}${word}`;
			}
			if (line) linesOut.push(line);
			return linesOut;
		};
		const rawLines = typedText.length ? typedText.split('\n') : [''];
		const maxTypedLineWidth = Math.max(64, livingRoomTerminalLayout.w - 18);
		const lines = [];
		for (const rawLine of rawLines) {
			lines.push(...wrapTypedLine(rawLine, maxTypedLineWidth));
		}
		let cursorX = tvTerminalStartX;
		let cursorY = tvTerminalStartY;
		const makeKeywordChunks = (input, baseFill) => {
			const text = String(input || '');
			if (!text) return [];
			const chunks = [];
			let cursor = 0;
			while (cursor < text.length) {
				let next = null;
				for (const rule of terminalKeywordRules) {
					const index = text.toLowerCase().indexOf(rule.text.toLowerCase(), cursor);
					if (index === -1) continue;
					if (!next || index < next.index || (index === next.index && rule.text.length > next.rule.text.length)) {
						next = { index, rule };
					}
				}
				if (!next) {
					chunks.push({ text: text.slice(cursor), fill: baseFill });
					break;
				}
				if (next.index > cursor) {
					chunks.push({ text: text.slice(cursor, next.index), fill: baseFill });
				}
				const matchText = text.slice(next.index, next.index + next.rule.text.length);
				chunks.push({
					text: matchText,
					fill: next.rule.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? TERMINAL_RAINBOW_FILL : TERMINAL_ACCENT_COLOR,
				});
				cursor = next.index + next.rule.text.length;
			}
			return chunks;
		};
		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const lineText = lines[lineIndex] || '';
			const line = new PIXI.Container();
			line.position.set(tvTerminalStartX, tvTerminalStartY + lineIndex * tvTerminalLineHeight);
			let lineX = 0;
			const appendChunk = (chunkText, color) => {
				if (!chunkText) return;
				const chunk = new PIXI.Text(chunkText, {
					fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
					fontSize: tvTerminalFontSize,
					fill: color,
					letterSpacing: 0.8,
				});
				chunk.position.set(lineX, 0);
				line.addChild(chunk);
				lineX += chunk.width;
			};
			const trimmedLine = lineText.trim();
			const labelMatch = lineText.match(/^([A-Z ]+):\s*(.*)$/);
			const standaloneLabelColor = TERMINAL_LABEL_COLORS[trimmedLine.toUpperCase()];
			if (!labelMatch && standaloneLabelColor && trimmedLine.length > 0 && !/^>/.test(trimmedLine)) {
				appendChunk(trimmedLine.toUpperCase(), standaloneLabelColor);
			} else if (labelMatch) {
				const rawLabel = (labelMatch[1] || '').trim();
				const body = labelMatch[2] || '';
				appendChunk(`${rawLabel}:`, TERMINAL_LABEL_COLORS[rawLabel] || 0x96bfdc);
				if (body) {
					appendChunk(' ', TERMINAL_BASE_COLOR);
					for (const chunk of makeKeywordChunks(body, TERMINAL_BASE_COLOR)) {
						appendChunk(chunk.text, chunk.fill);
					}
				}
			} else if (/^\s{2,}>\s+/.test(lineText)) {
				appendChunk(lineText, TERMINAL_LINK_COLOR);
			} else if (/^>\s+/.test(lineText)) {
				for (const chunk of makeKeywordChunks(lineText, 0xffe1bb)) {
					appendChunk(chunk.text, chunk.fill);
				}
			} else {
				for (const chunk of makeKeywordChunks(lineText, TERMINAL_BASE_COLOR)) {
					appendChunk(chunk.text, chunk.fill);
				}
			}
			tvTerminalLines.addChild(line);
			cursorX = tvTerminalStartX + lineX;
			cursorY = tvTerminalStartY + lineIndex * tvTerminalLineHeight;
		}
		tvTerminalCursor.clear();
		tvTerminalCursor.beginFill(0xe8f6ff, 0.95);
		tvTerminalCursor.drawRect(
			0,
			0,
			Math.max(6, Math.round(tvTerminalFontSize * 0.52)),
			Math.max(10, Math.round(tvTerminalFontSize * 0.98)),
		);
		tvTerminalCursor.endFill();
		tvTerminalCursor.position.set(cursorX + 6, cursorY + Math.max(1, Math.round(tvTerminalFontSize * 0.06)));
	};

	const setTerminalText = (nextText, sourceKey = nextText, { instant = false } = {}) => {
		if (terminalSourceKey === sourceKey && terminalFullText === nextText) return;
		terminalSourceKey = sourceKey;
		terminalFullText = nextText;
		terminalTypeTimer = 0;
		terminalRenderedSnapshot = '';
		terminalTypedIndex = instant ? terminalFullText.length : 0;
		renderTerminalTypedText(true);
	};

	const setTerminalOverviewText = (nextText, sourceKey = nextText, { instant = false } = {}) => {
		if (terminalOverviewSourceKey === sourceKey && terminalOverviewFullText === nextText) return;
		terminalOverviewSourceKey = sourceKey;
		terminalOverviewFullText = String(nextText || '');
		terminalOverviewTypeTimer = 0;
		terminalOverviewTypedIndex = instant ? terminalOverviewFullText.length : 0;
		tvTerminalOverviewText.text = terminalOverviewFullText.slice(0, terminalOverviewTypedIndex);
	};

	const stepTerminalOverviewTyping = (dtSeconds) => {
		if (!tvTerminalOverviewText.visible) return;
		if (terminalOverviewTypedIndex >= terminalOverviewFullText.length) return;
		if (getTerminalTypingHold()) return;
		terminalOverviewTypeTimer += dtSeconds * TERMINAL_TYPE_RATE;
		const charsToAdd = Math.floor(terminalOverviewTypeTimer);
		if (charsToAdd <= 0) return;
		terminalOverviewTypeTimer -= charsToAdd;
		terminalOverviewTypedIndex = Math.min(terminalOverviewFullText.length, terminalOverviewTypedIndex + charsToAdd);
		tvTerminalOverviewText.text = terminalOverviewFullText.slice(0, terminalOverviewTypedIndex);
	};

	const wrapTerminalText = (value, maxChars = 40) => {
		const text = String(value || '').trim();
		if (!text) return [];
		const words = text.split(/\s+/);
		const lines = [];
		let line = '';
		for (const word of words) {
			const candidate = line ? `${line} ${word}` : word;
			if (candidate.length <= maxChars || !line) {
				line = candidate;
				continue;
			}
			lines.push(line);
			line = word;
		}
		if (line) lines.push(line);
		return lines;
	};

	const clearTerminalDesignWave = () => {
		destroyContainerChildren(tvTerminalDesignWave);
		tvTerminalDesignWaveCover.clear();
		tvTerminalDesignWaveCover.visible = false;
		tvTerminalDesignWaveMask.clear();
		terminalDesignWaveGlyphs = [];
		tvTerminalDesignWave.visible = false;
		tvTerminalDesignText.alpha = 1;
	};

	const buildTerminalDesignWave = (sourceText, { fontSize, lineHeight, wrapWidth }) => {
		clearTerminalDesignWave();
		const source = String(sourceText || '');
		const preserveTrailingSpaces = (value) => String(value || '').replace(/ +$/g, (spaces) => '\u00A0'.repeat(spaces.length));
		const phraseLower = TERMINAL_AERO_WAVE_TEXT.toLowerCase();
		const lowerSource = source.toLowerCase();
		const startIndex = lowerSource.indexOf(phraseLower);
		if (startIndex === -1) return source;

		const phraseText = source.slice(startIndex, startIndex + TERMINAL_AERO_WAVE_TEXT.length);
		if (!phraseText.trim().length || !PIXI.TextMetrics?.measureText) return source;

		const glyphStyle = {
			fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
			fontSize,
			fill: 0xffffff,
			letterSpacing: 0.5,
		};
		const measureStyle = new PIXI.TextStyle({
			...glyphStyle,
			wordWrap: true,
			wordWrapWidth: wrapWidth,
			lineHeight,
		});
		tvTerminalDesignWaveCover.beginFill(TERMINAL_AERO_HIDE_COLOR, 1);

		for (let i = 0; i < phraseText.length; i++) {
			const char = phraseText[i];
			if (char === '\n') continue;
			const beforeText = source.slice(0, startIndex + i);
			const withCharText = source.slice(0, startIndex + i + 1);
			const beforeMetrics = PIXI.TextMetrics.measureText(preserveTrailingSpaces(beforeText), measureStyle);
			const withCharMetrics = PIXI.TextMetrics.measureText(preserveTrailingSpaces(withCharText), measureStyle);
			const lineIndex = Math.max(0, withCharMetrics.lines.length - 1);
			const beforeLineIndex = Math.max(0, beforeMetrics.lines.length - 1);
			const x = lineIndex === beforeLineIndex ? (beforeMetrics.lineWidths[beforeLineIndex] || 0) : 0;
			const y = lineIndex * lineHeight;
			if (!char.trim().length) continue;

			const glyph = new PIXI.Text(char, glyphStyle);
			glyph.position.set(x, y);
			tvTerminalDesignWave.addChild(glyph);
			const hidePadX = 1.1;
			const hidePadY = 0.65;
			tvTerminalDesignWaveCover.drawRect(
				x - hidePadX,
				y - hidePadY,
				glyph.width + hidePadX * 2,
				lineHeight + hidePadY * 2,
			);
			terminalDesignWaveGlyphs.push({
				node: glyph,
				baseY: y,
				phase: i * 0.58,
				colorPhase: i * 0.33,
			});
		}
		tvTerminalDesignWaveCover.endFill();

		tvTerminalDesignWave.visible = terminalDesignWaveGlyphs.length > 0;
		if (!tvTerminalDesignWave.visible) return source;
		tvTerminalDesignWaveCover.visible = true;
		tvTerminalDesignText.alpha = 1;
		return source;
	};

	const stepTerminalDesignWave = (pulseTime) => {
		if (!tvTerminalDesignWave.visible || !terminalDesignWaveGlyphs.length) return;
		for (const glyph of terminalDesignWaveGlyphs) {
			const yWave = Math.sin(pulseTime * TERMINAL_AERO_WAVE_SPEED + glyph.phase);
			const colorMix = 0.5 + 0.5 * Math.sin(pulseTime * TERMINAL_AERO_WAVE_COLOR_SPEED + glyph.colorPhase);
			glyph.node.y = glyph.baseY + yWave * TERMINAL_AERO_WAVE_AMPLITUDE;
			glyph.node.tint = mixColors(TERMINAL_AERO_WAVE_SEA_BLUE, TERMINAL_AERO_WAVE_LIGHT_PURPLE, colorMix);
		}
	};

	const revealTerminalTextNow = () => {
		if (terminalTypedIndex < terminalFullText.length) {
			terminalTypedIndex = terminalFullText.length;
			terminalTypeTimer = 0;
			renderTerminalTypedText(true);
		}
		if (terminalOverviewTypedIndex < terminalOverviewFullText.length) {
			terminalOverviewTypedIndex = terminalOverviewFullText.length;
			terminalOverviewTypeTimer = 0;
			tvTerminalOverviewText.text = terminalOverviewFullText;
		}
	};

	const getDisplayTypingState = () => ({
		terminalTypingHold: getTerminalTypingHold(),
		terminalTypeTimer,
		terminalTypedIndex,
		terminalCursorBlinkTimer,
	});

	const applyDisplayEffectsResult = (displayEffectsResult) => {
		terminalTypeTimer = displayEffectsResult.terminalTypeTimer;
		terminalTypedIndex = displayEffectsResult.terminalTypedIndex;
		terminalCursorBlinkTimer = displayEffectsResult.terminalCursorBlinkTimer;
		if (displayEffectsResult.shouldRenderTerminalTypedText) {
			renderTerminalTypedText();
		}
	};

	return {
		revealTerminalTextNow,
		dedupeKeywordRules,
		renderTerminalTypedText,
		setTerminalText,
		setTerminalOverviewText,
		stepTerminalOverviewTyping,
		wrapTerminalText,
		clearTerminalDesignWave,
		buildTerminalDesignWave,
		stepTerminalDesignWave,
		getTerminalDesignWaveGlyphs: () => terminalDesignWaveGlyphs,
		getTerminalFullText: () => terminalFullText,
		setTerminalKeywordRules: (rules) => {
			terminalKeywordRules = Array.isArray(rules) ? rules : [];
		},
		setTerminalLinkLabelSet: (labels) => {
			terminalLinkLabelSet = labels instanceof Set ? labels : new Set();
		},
		getTerminalLinkLabelSet: () => terminalLinkLabelSet,
		getDisplayTypingState,
		applyDisplayEffectsResult,
	};
}
