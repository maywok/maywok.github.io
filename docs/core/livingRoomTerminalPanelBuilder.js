export function rebuildLivingRoomTerminalPanelView(context, { instant = false } = {}) {
	const {
		PIXI,
		PORTFOLIO_HIGHLIGHT_ACCENT,
		PORTFOLIO_HIGHLIGHT_RAINBOW,
		PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
		TERMINAL_AERO_WAVE_AMPLITUDE,
		TERMINAL_ACCENT_COLOR,
		TERMINAL_LABEL_COLORS,
		TERMINAL_LINK_COLOR,
		TERMINAL_RAINBOW_FILL,
		STATIC_TERMINAL_KEYWORDS,
		DEFAULT_TERMINAL_TEXT,
		livingRoomSlideIndex,
		livingRoomState,
		livingRoomTerminalLayout,
		tvBroTitle,
		tvBroSub,
		tvTerminalSlideTitle,
		tvTerminalSlideValue,
		tvTerminalOverviewLabel,
		tvTerminalOverviewText,
		tvTerminalDesignLabel,
		tvTerminalDesignText,
		tvTerminalTechLabel,
		tvTerminalTechText,
		tvTerminalHighlightsLabel,
		tvTerminalHighlights,
		tvTerminalLinksLabel,
		tvTerminalLinks,
		tvTerminalDesignWaveCover,
		tvTerminalDesignWave,
		tvTerminalDesignWaveMask,
		tvTerminalLines,
		tvTerminalCursor,
		tvTerminalStartX,
		tvTerminalStartY,
		tvTerminalFontSize,
		getTerminalDesignWaveGlyphs,
		getActiveProject,
		getActiveSlide,
		dedupeKeywordRules,
		normalizeHighlight,
		destroyContainerChildren,
		clearTerminalDesignWave,
		setTerminalText,
		setTerminalOverviewText,
		wrapTerminalText,
		buildTerminalDesignWave,
	} = context;

	const project = getActiveProject();
	const slide = getActiveSlide();
	const approxChars = Math.max(16, Math.floor((livingRoomTerminalLayout.w - 16) / 9.8));
	const linkDefs = [...(slide.links || []), ...(project.links || [])]
		.filter((link) => link?.label && link?.url);
	const nextTerminalLinkLabelSet = new Set(linkDefs.map((link) => String(link.label).toLowerCase()));
	const nextTerminalKeywordRules = dedupeKeywordRules([
		...STATIC_TERMINAL_KEYWORDS,
		...(slide.highlights || []).map((entry) => normalizeHighlight(entry)).filter(Boolean),
		{ text: 'bro', style: PORTFOLIO_HIGHLIGHT_ACCENT },
	]);
	
	tvBroTitle.text = 'TERMINAL';
	tvBroSub.visible = false;
	tvTerminalSlideTitle.visible = false;
	tvTerminalSlideValue.visible = false;
	tvTerminalOverviewLabel.visible = false;
	tvTerminalOverviewText.visible = false;
	tvTerminalDesignLabel.visible = false;
	tvTerminalDesignText.visible = false;
	tvTerminalTechLabel.visible = false;
	tvTerminalTechText.visible = false;
	tvTerminalHighlightsLabel.visible = false;
	tvTerminalHighlights.visible = false;
	tvTerminalLinksLabel.visible = false;
	tvTerminalLinks.visible = false;
	tvTerminalDesignWaveCover.visible = false;
	tvTerminalDesignWave.visible = false;
	tvTerminalLines.visible = true;
	destroyContainerChildren(tvTerminalHighlights);
	destroyContainerChildren(tvTerminalLinks);
	clearTerminalDesignWave();

	let nextText = null;
	let nextSourceKey = `${project.id}:${livingRoomSlideIndex}:${livingRoomState.emptyPreviewWord}`;
	const useHomeStructuredMinimal = project.useDesktopFeed && project.id === 'default-home';
	if (project.status === 'empty') {
		nextText = `Nothing here yet ${livingRoomState.emptyPreviewWord}`;
		setTerminalOverviewText('', `${nextSourceKey}:overview-empty`, { instant: true });
	} else if (project.useDesktopFeed && !useHomeStructuredMinimal) {
		nextText = DEFAULT_TERMINAL_TEXT;
		setTerminalOverviewText('', `${nextSourceKey}:overview-home`, { instant: true });
	} else {
		const showExtendedSections = !useHomeStructuredMinimal;
		tvTerminalLines.visible = false;
		tvTerminalCursor.visible = false;
		tvTerminalDesignLabel.visible = showExtendedSections;
		tvTerminalDesignText.visible = showExtendedSections;
		tvTerminalTechLabel.visible = showExtendedSections;
		tvTerminalTechText.visible = showExtendedSections;
		tvTerminalSlideTitle.visible = true;
		tvTerminalSlideValue.visible = true;
		tvTerminalOverviewLabel.visible = true;
		tvTerminalOverviewText.visible = true;
		tvTerminalHighlightsLabel.visible = showExtendedSections;
		tvTerminalHighlights.visible = showExtendedSections;
		tvTerminalLinksLabel.visible = showExtendedSections;
		tvTerminalLinks.visible = showExtendedSections;
		setTerminalText('', `${project.id}:${livingRoomSlideIndex}:structured-clear`, { instant: true });

		const terminalX = tvTerminalStartX;
		let y = tvTerminalStartY;
		const infoWidth = Math.max(90, livingRoomTerminalLayout.w - 4);
		const sectionLabelSize = Math.max(10, tvTerminalFontSize - 1);
		const sectionBodySize = Math.max(11, tvTerminalFontSize);
		const sectionLineHeight = Math.max(16, Math.round(sectionBodySize * 1.55));
		const sectionLabelGap = 14;
		const sectionGap = 14;
		tvTerminalSlideTitle.style.fill = TERMINAL_LABEL_COLORS.SLIDE;
		tvTerminalOverviewLabel.style.fill = TERMINAL_LABEL_COLORS.OVERVIEW;
		tvTerminalDesignLabel.style.fill = TERMINAL_LABEL_COLORS.DESIGN;
		tvTerminalTechLabel.style.fill = TERMINAL_LABEL_COLORS.TECHNICAL;
		tvTerminalHighlightsLabel.style.fill = TERMINAL_LABEL_COLORS.HIGHLIGHTS;
		tvTerminalLinksLabel.style.fill = TERMINAL_LABEL_COLORS.LINKS;
		tvTerminalSlideTitle.style.fontSize = sectionLabelSize;
		tvTerminalOverviewLabel.style.fontSize = sectionLabelSize;
		tvTerminalDesignLabel.style.fontSize = sectionLabelSize;
		tvTerminalTechLabel.style.fontSize = sectionLabelSize;
		tvTerminalSlideValue.style.fontSize = sectionBodySize;
		tvTerminalSlideValue.style.lineHeight = sectionLineHeight;
		tvTerminalSlideValue.style.wordWrapWidth = infoWidth;
		tvTerminalSlideValue.style.fill = useHomeStructuredMinimal ? 0xffffff : 0xe9dfcd;
		tvTerminalOverviewText.style.fontSize = sectionBodySize;
		tvTerminalOverviewText.style.lineHeight = sectionLineHeight;
		tvTerminalOverviewText.style.wordWrapWidth = infoWidth;
		tvTerminalDesignText.style.fontSize = sectionBodySize;
		tvTerminalDesignText.style.lineHeight = sectionLineHeight;
		tvTerminalTechText.style.fontSize = sectionBodySize;
		tvTerminalTechText.style.lineHeight = sectionLineHeight;
		tvTerminalDesignText.style.wordWrapWidth = infoWidth;
		tvTerminalTechText.style.wordWrapWidth = infoWidth;

		tvTerminalSlideTitle.text = 'SLIDE';
		tvTerminalSlideTitle.position.set(terminalX, y);
		y += sectionLabelGap;
		tvTerminalSlideValue.text = useHomeStructuredMinimal
			? String(project.title || slide.title || 'Main Page')
			: String(slide.title || 'Untitled');
		tvTerminalSlideValue.position.set(terminalX, y);
		y += tvTerminalSlideValue.height + sectionGap;

		tvTerminalOverviewLabel.text = 'OVERVIEW';
		tvTerminalOverviewLabel.position.set(terminalX, y);
		y += sectionLabelGap;
		tvTerminalOverviewText.position.set(terminalX, y);
		const overviewBody = useHomeStructuredMinimal
			? (slide.overview || project.summary || 'Thanks for visiting my page!')
			: (slide.overview || project.summary || 'No overview provided.');
		const overviewLineCount = Math.max(1, wrapTerminalText(overviewBody, approxChars).length);
		const overviewReservedHeight = overviewLineCount * sectionLineHeight;
		setTerminalOverviewText(overviewBody, `${project.id}:${livingRoomSlideIndex}:overview`, { instant });
		y += overviewReservedHeight + sectionGap;

		if (showExtendedSections) {
			tvTerminalDesignLabel.position.set(terminalX, y);
			y += sectionLabelGap;
			const designBody = slide.design || 'No design notes provided.';
						tvTerminalDesignText.text = buildTerminalDesignWave(designBody, {
				fontSize: sectionBodySize,
				lineHeight: sectionLineHeight,
				wrapWidth: infoWidth,
			});
						const terminalDesignWaveGlyphs = typeof getTerminalDesignWaveGlyphs === 'function'
							? (getTerminalDesignWaveGlyphs() || [])
							: [];
			tvTerminalDesignText.position.set(terminalX, y);
			tvTerminalDesignWaveCover.position.set(terminalX, y);
			tvTerminalDesignWave.position.set(terminalX, y);
			tvTerminalDesignWave.visible = tvTerminalDesignText.visible && terminalDesignWaveGlyphs.length > 0;
			tvTerminalDesignWaveMask.clear();
			if (terminalDesignWaveGlyphs.length > 0) {
				const waveMaskPadY = Math.max(1, TERMINAL_AERO_WAVE_AMPLITUDE + 1.1);
				tvTerminalDesignWaveMask.beginFill(0xffffff, 1);
				tvTerminalDesignWaveMask.drawRect(
					terminalX - 1,
					y - waveMaskPadY,
					infoWidth + 2,
					tvTerminalDesignText.height + waveMaskPadY * 2,
				);
				tvTerminalDesignWaveMask.endFill();
			}
			y += tvTerminalDesignText.height + sectionGap;

			tvTerminalTechLabel.position.set(terminalX, y);
			y += sectionLabelGap;
			tvTerminalTechText.text = slide.technical || 'No technical notes provided.';
			tvTerminalTechText.position.set(terminalX, y);
			y += tvTerminalTechText.height + 12;

			let chipX = 0;
			let chipY = 0;
			const highlightText = (slide.highlights || [])
				.map((entry) => normalizeHighlight(entry)?.text)
				.filter(Boolean)
				.join(' / ');
			for (const rawHighlight of (slide.highlights || [])) {
				const highlight = normalizeHighlight(rawHighlight);
				if (!highlight) continue;
				const chip = new PIXI.Container();
				const chipBg = new PIXI.Graphics();
				const chipText = new PIXI.Text(highlight.text, {
					fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
					fontSize: 9,
					fill: highlight.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? TERMINAL_RAINBOW_FILL : TERMINAL_ACCENT_COLOR,
					letterSpacing: 0.5,
				});
				const chipPadX = 7;
				const chipW = Math.ceil(chipText.width + chipPadX * 2);
				const chipH = 16;
				if (chipX > 0 && chipX + chipW > infoWidth) {
					chipX = 0;
					chipY += chipH + 5;
				}
				chipBg.beginFill(0x2e5162, 0.72);
				chipBg.lineStyle(1, highlight.style === PORTFOLIO_HIGHLIGHT_RAINBOW ? 0xff7fc1 : 0x7fc9ff, 0.82);
				chipBg.drawRoundedRect(0, 0, chipW, chipH, 4);
				chipBg.endFill();
				chipText.position.set(chipPadX, 4);
				chip.addChild(chipBg, chipText);
				chip.position.set(chipX, chipY);
				chipX += chipW + 6;
				tvTerminalHighlights.addChild(chip);
			}

			let linkY = 0;
			for (const linkDef of linkDefs) {
				const row = new PIXI.Container();
				const linkText = new PIXI.Text(`> ${linkDef.label}`, {
					fontFamily: PORTFOLIO_RIGHT_INFO_FONT_FAMILY,
					fontSize: 9,
					fill: TERMINAL_LINK_COLOR,
					letterSpacing: 0.5,
				});
				const underline = new PIXI.Graphics();
				underline.lineStyle(1, TERMINAL_LINK_COLOR, 0.72);
				underline.moveTo(0, linkText.height + 1);
				underline.lineTo(linkText.width, linkText.height + 1);
				row.addChild(linkText, underline);
				row.position.set(0, linkY);
				row.eventMode = 'static';
				row.cursor = 'pointer';
				row.on('pointerover', () => {
					linkText.style.fill = 0xffffff;
					underline.tint = 0xffffff;
				});
				row.on('pointerout', () => {
					linkText.style.fill = TERMINAL_LINK_COLOR;
					underline.tint = TERMINAL_LINK_COLOR;
				});
				row.on('pointertap', () => {
					try {
						window.open(linkDef.url, '_blank', 'noopener');
					} catch (_) {}
				});
				tvTerminalLinks.addChild(row);
				linkY += linkText.height + 7;
			}

			const terminalBottom = livingRoomTerminalLayout.y + livingRoomTerminalLayout.h - 6;
			const highlightsBlockHeight = tvTerminalHighlightsLabel.height + 6 + (tvTerminalHighlights.height || (highlightText ? 16 : 0));
			const linksBlockHeight = tvTerminalLinksLabel.height + 6 + (tvTerminalLinks.height || 0);
			const footerGap = 12;
			const footerTotal = highlightsBlockHeight + footerGap + linksBlockHeight;
			const footerStartY = Math.max(y + 10, terminalBottom - footerTotal);

			tvTerminalHighlightsLabel.position.set(terminalX, footerStartY);
			tvTerminalHighlights.position.set(terminalX, footerStartY + tvTerminalHighlightsLabel.height + 6);

			const linksStartY = tvTerminalHighlights.position.y + (tvTerminalHighlights.height || (highlightText ? 16 : 0)) + footerGap;
			tvTerminalLinksLabel.position.set(terminalX, linksStartY);
			tvTerminalLinks.position.set(terminalX, linksStartY + tvTerminalLinksLabel.height + 6);
		}
	}

	if (nextText !== null) {
		setTerminalText(nextText, nextSourceKey, { instant });
	}

	return {
		terminalKeywordRules: nextTerminalKeywordRules,
		terminalLinkLabelSet: nextTerminalLinkLabelSet,
	};
}
