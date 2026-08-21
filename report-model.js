/**
 * Turns a completed scan JSON payload into a report document.
 * Free tier: a readable multi-page audit. Pro/consultant shapes are reserved.
 */

export const REPORT_TIERS = {
  free: {
    id: 'free',
    name: 'Free Report',
    maxDetailedGroups: 8,
    includeAllLocationsInDetail: false,
    maxCropsPerFinding: 3,
  },
  pro: {
    id: 'pro',
    name: 'Pro Report',
    maxDetailedGroups: Infinity,
    includeAllLocationsInDetail: true,
    maxCropsPerFinding: 6,
  },
  consultant: {
    id: 'consultant',
    name: 'Consultant Report',
    maxDetailedGroups: Infinity,
    includeAllLocationsInDetail: true,
    maxCropsPerFinding: 8,
  },
};

export const SITE_ORIGIN = 'https://a11xyz.com';

const SEVERITY_ORDER = ['crit', 'serious', 'moderate', 'minor'];
const SEVERITY_LABEL = {
  crit: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
};

const WCAG_NAMES = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.4.1': 'Use of Color',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.11': 'Non-text Contrast',
  '1.4.12': 'Text Spacing',
  '2.1.1': 'Keyboard',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '2.5.3': 'Label in Name',
  '2.5.8': 'Target Size (Minimum)',
  '3.1.1': 'Language of Page',
  '3.2.2': 'On Input',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '4.1.2': 'Name, Role, Value',
  '4.1.3': 'Status Messages',
};

const ROLE_GUIDANCE = {
  'color-contrast': {
    design: 'Choose text and background colours that meet at least 4.5:1 (3:1 for large text) and check this in the design file before handoff.',
    development: 'Use those colour tokens in CSS so the rendered text meets the same ratios. Do not rely on images of text to carry body copy.',
  },
  'color-contrast-enhanced': {
    design: 'For AAA, text needs 7:1 against its background (4.5:1 for large text). Confirm this in the design, not only in the browser.',
    development: 'Update colour tokens so the live text meets 7:1 (4.5:1 for large text).',
  },
  'link-name': {
    design: 'Every link should have visible text, or a visible text alternative, that describes the destination or purpose.',
    development: 'Use descriptive link text. If the control is icon-only, give it an accessible name with aria-label or equivalent.',
  },
  'button-name': {
    design: 'Icon-only buttons still need a name that can be implemented as a visible label or tooltip. The action should be obvious without the icon.',
    development: 'Add visible text, aria-label, or aria-labelledby that names the action.',
  },
  'image-alt': {
    design: 'Decide which images are informative and which are decorative, and write short alt text for the informative ones.',
    development: 'Add alt text that describes the image, or alt="" if it is decorative.',
  },
  'svg-img-alt': {
    design: 'If an SVG is content rather than decoration, it needs a short text alternative the same way a photograph does.',
    development: 'Add aria-label, or a title element inside the SVG, and give the SVG an image role when it is used as an image.',
  },
  label: {
    design: 'Every input should have a persistent visible label. Placeholder text is not a substitute.',
    development: 'Associate a label with the input using for/id, or wrap the input in a label.',
  },
  'select-name': {
    design: 'Select menus need a visible label that names the choice, such as Country, not only placeholder or first-option text.',
    development: 'Add a label linked to the select, or aria-label if a visible label cannot be shown.',
  },
  'heading-order': {
    design: 'Use heading levels to match the outline of the page, not only the visual size of the type.',
    development: 'Use headings in order: h1, then h2, then h3, without skipping levels.',
  },
  'page-has-heading-one': {
    design: 'The page needs one clear title that can be implemented as an h1.',
    development: 'Add one h1 that names the page.',
  },
  'html-has-lang': {
    design: null,
    development: 'Add a lang attribute on the html element, for example lang="en".',
  },
  'document-title': {
    design: 'Give the page a unique title that would make sense in a browser tab or search result.',
    development: 'Add a unique, descriptive title element in the document head.',
  },
  'target-size': {
    design: 'Make buttons, links, and other controls at least 24 by 24 pixels. Icon-only controls are easier at 44 by 44.',
    development: 'Set min-width and min-height (or padding) so the clickable area is at least 24 by 24 CSS pixels.',
  },
  'text-size': {
    design: 'Keep body text at 16px where you can, and do not set type below 12px.',
    development: 'Increase font-size to at least 12px (16px for body copy and form fields).',
  },
};

const MAX_MARKER_NUDGE = 12;
const CONTENT_WIDTH_MM = 178;
const PANEL_MAX_MM = 148;
const MAX_OVERVIEW_PANELS = 4;

export function severityLabel(severity) {
  return SEVERITY_LABEL[severity] || 'Minor';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeCssUrl(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\)/g, '\\)');
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'site';
  }
}

export function reportFilename(doc, when = new Date()) {
  const host = hostFromUrl(doc.url).replace(/[^a-z0-9.-]+/gi, '-').replace(/-+/g, '-');
  const day = (doc.scannedAt ? new Date(doc.scannedAt) : when).toISOString().slice(0, 10);
  return `a11xyz-accessibility-report-${host}-${day}.pdf`;
}

function formatScanDate(iso) {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function groupKey(issue) {
  return [issue.ruleId || '', issue.severity || '', issue.wcag || '', issue.title || '', issue.fixText || ''].join('\u0001');
}

function snippetHtml(html) {
  if (!html) return '';
  const compact = String(html).replace(/\s+/g, ' ').trim();
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

function locationFromIssue(issue, index) {
  const box = issue.boundingBox || { x: 0, y: 0, width: 0, height: 0 };
  const hasBox = box.width > 0 || box.height > 0 || box.x > 0 || box.y > 0;
  return {
    index,
    selector: issue.selector || '',
    html: snippetHtml(issue.html),
    boundingBox: {
      x: Number(box.x) || 0,
      y: Number(box.y) || 0,
      width: Number(box.width) || 0,
      height: Number(box.height) || 0,
    },
    hasBox,
  };
}

function letterSuffix(i) {
  let n = i;
  let out = '';
  do {
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function padGroup(n) {
  return String(n).padStart(2, '0');
}

function nudgeOverlapping(markers) {
  const placed = [];
  for (const marker of markers) {
    if (!marker.hasBox) {
      placed.push(marker);
      continue;
    }
    let x = marker.xPct;
    let y = marker.yPct;
    let guard = 0;
    while (guard < MAX_MARKER_NUDGE) {
      const clash = placed.some((other) => {
        if (!other.hasBox) return false;
        const dx = other.xPct - x;
        const dy = other.yPct - y;
        return dx * dx + dy * dy < 4.4 * 4.4;
      });
      if (!clash) break;
      x = Math.min(96, x + 2.8);
      y = Math.min(96, y + 2.8);
      guard += 1;
    }
    placed.push({ ...marker, xPct: x, yPct: y });
  }
  return placed.map((marker) => {
    const padX = marker.label && String(marker.label).length > 3 ? 9 : 7;
    const padY = 6;
    return {
      ...marker,
      xPct: Math.min(100 - padX, Math.max(padX, marker.xPct)),
      yPct: Math.min(100 - padY, Math.max(padY, marker.yPct)),
    };
  });
}

function emptySummary() {
  return { crit: 0, serious: 0, moderate: 0, minor: 0 };
}

function tallySummary(issues) {
  const summary = emptySummary();
  for (const issue of issues) {
    const key = SEVERITY_ORDER.includes(issue.severity) ? issue.severity : 'minor';
    summary[key] += 1;
  }
  return summary;
}

function wcagName(code) {
  return WCAG_NAMES[code] || '';
}

function happeningText(group) {
  const n = group.locations.length;
  const once = n === 1;
  const templates = {
    'link-name': once
      ? 'A link on this page has no accessible name, so assistive technology cannot describe where it leads.'
      : `${n} links on this page have no accessible name, so assistive technology cannot describe where they lead.`,
    'button-name': once
      ? 'A button on this page has no accessible name. Screen readers may announce it only as "button".'
      : `${n} buttons on this page have no accessible name. Screen readers may announce them only as "button".`,
    'image-alt': once
      ? 'An image on this page has no alt text, so its meaning is not available to people who cannot see it.'
      : `${n} images on this page have no alt text, so their meaning is not available to people who cannot see them.`,
    'svg-img-alt': once
      ? 'An SVG used as an image has no accessible name.'
      : `${n} SVGs used as images have no accessible name.`,
    label: once
      ? 'A form field on this page is missing a label, so its purpose is not programmatically named.'
      : `${n} form fields on this page are missing labels, so their purpose is not programmatically named.`,
    'select-name': once
      ? 'A select menu on this page is missing a label.'
      : `${n} select menus on this page are missing labels.`,
    'color-contrast': once
      ? 'Text on this page does not meet the WCAG AA contrast minimum against its background.'
      : `Text in ${n} places on this page does not meet the WCAG AA contrast minimum against its background.`,
    'html-has-lang': 'The page does not declare its language on the html element.',
    'document-title': 'The page has no document title.',
    'page-has-heading-one': 'The page has no h1 heading, so the document outline has no start point.',
    'heading-order': once
      ? 'A heading on this page skips a level, so the outline no longer matches the structure of the content.'
      : `Heading levels are skipped in ${n} places, so the outline no longer matches the structure of the content.`,
    'landmark-one-main': 'The page is missing a main landmark for its primary content.',
    region: once
      ? 'Some content sits outside any landmark region, so it is harder to find with assistive technology.'
      : `Content in ${n} places sits outside any landmark region, so it is harder to find with assistive technology.`,
    bypass: 'There is no skip link or main landmark to jump past repeated navigation.',
    tabindex: once
      ? 'An element uses a positive tabindex, which can pull keyboard focus out of document order.'
      : `${n} elements use a positive tabindex, which can pull keyboard focus out of document order.`,
    'target-size': once
      ? 'A button or other control is smaller than 24 by 24 pixels, so it is hard to tap accurately.'
      : `${n} buttons or other controls are smaller than 24 by 24 pixels, so they are hard to tap accurately.`,
    'text-size': once
      ? 'Text on this page is smaller than 12px, which is hard to read at default zoom.'
      : `Text in ${n} places on this page is smaller than 12px, which is hard to read at default zoom.`,
  };
  if (templates[group.ruleId]) return templates[group.ruleId];
  const place = once ? 'once on this page' : `in ${n} locations on this page`;
  return `${String(group.title || 'An accessibility issue').replace(/\.$/, '')} was detected ${place}.`;
}

function meaningSummary(count, summary) {
  if (!count) {
    return 'The automated scan did not detect WCAG 2.2 AA issues on this page. That is not a certification of compliance. Keyboard testing, assistive-technology testing and testing with disabled people where appropriate are still recommended.';
  }
  const noun = count === 1 ? 'issue was' : 'issues were';
  const crit = Number(summary.crit) || 0;
  const serious = Number(summary.serious) || 0;
  const moderate = Number(summary.moderate) || 0;
  const minor = Number(summary.minor) || 0;
  let focus = '';
  if (crit && serious) {
    focus = ` ${crit} ${crit === 1 ? 'is' : 'are'} classified as critical and ${serious} as serious, and should be prioritised.`;
  } else if (crit) {
    focus = ` ${crit} ${crit === 1 ? 'is' : 'are'} classified as critical and should be prioritised.`;
  } else if (serious) {
    focus = ` ${serious} ${serious === 1 ? 'is' : 'are'} classified as serious and should be prioritised.`;
  } else if (moderate) {
    focus = ` None are classified as critical or serious. Review the ${moderate} moderate ${moderate === 1 ? 'issue' : 'issues'} first.`;
  } else {
    focus = ` None are classified as critical or serious. The ${minor} minor ${minor === 1 ? 'issue is' : 'issues are'} still worth fixing.`;
  }
  return `${count} automated accessibility ${noun} detected on this page.${focus}`;
}

function cropForBox(box, pageSize) {
  const srcW = Math.max(1, pageSize.width);
  const srcH = Math.max(1, pageSize.height);
  const padX = Math.max(80, Math.min(srcW * 0.14, box.width * 1.6 + 64));
  const padY = Math.max(52, Math.min(srcH * 0.1, box.height * 1.4 + 48));
  let x = Math.max(0, box.x - padX);
  let y = Math.max(0, box.y - padY);
  let w = Math.min(srcW - x, Math.max(box.width + padX * 2, Math.min(srcW, 720)));
  let h = Math.min(srcH - y, Math.max(box.height + padY * 2, 260));
  if (h > w * 0.62) h = Math.min(srcH - y, Math.max(200, w * 0.55));
  if (w < 1) w = Math.min(srcW, 320);
  if (h < 1) h = Math.min(srcH, 180);
  return { x, y, w, h };
}

function cropStyle(crop, pageSize) {
  const srcW = Math.max(1, pageSize.width);
  const srcH = Math.max(1, pageSize.height);
  const sizeX = (srcW / Math.max(1, crop.w)) * 100;
  const sizeY = (srcH / Math.max(1, crop.h)) * 100;
  const posX = srcW === crop.w ? 0 : (crop.x / (srcW - crop.w)) * 100;
  const posY = srcH === crop.h ? 0 : (crop.y / (srcH - crop.h)) * 100;
  return {
    aspect: `${crop.w} / ${crop.h}`,
    size: `${sizeX.toFixed(3)}% ${sizeY.toFixed(3)}%`,
    position: `${posX.toFixed(3)}% ${posY.toFixed(3)}%`,
  };
}

function highlightInCrop(box, crop) {
  return {
    left: ((box.x - crop.x) / Math.max(1, crop.w)) * 100,
    top: ((box.y - crop.y) / Math.max(1, crop.h)) * 100,
    width: (box.width / Math.max(1, crop.w)) * 100,
    height: (box.height / Math.max(1, crop.h)) * 100,
  };
}

function pickCrops(locations, pageSize, maxCrops) {
  const withBox = locations.filter((loc) => loc.hasBox);
  if (!withBox.length) return [];
  const scored = withBox
    .map((loc) => ({
      loc,
      area: loc.boundingBox.width * loc.boundingBox.height,
    }))
    .sort((a, b) => b.area - a.area || a.loc.boundingBox.y - b.loc.boundingBox.y);
  const chosen = [];
  for (const item of scored) {
    if (chosen.length >= maxCrops) break;
    const y = item.loc.boundingBox.y;
    const tooClose = chosen.some((other) => Math.abs(other.loc.boundingBox.y - y) < 48);
    if (tooClose && chosen.length) continue;
    chosen.push(item);
  }
  if (!chosen.length) chosen.push(scored[0]);
  chosen.sort((a, b) => a.loc.boundingBox.y - b.loc.boundingBox.y || a.loc.boundingBox.x - b.loc.boundingBox.x);
  return chosen.map(({ loc }) => {
    const crop = cropForBox(loc.boundingBox, pageSize);
    const style = cropStyle(crop, pageSize);
    return {
      label: loc.label,
      selector: loc.selector,
      html: loc.html,
      crop,
      style,
      highlight: highlightInCrop(loc.boundingBox, crop),
    };
  });
}

function codeExamples(group) {
  const better = String(group.fixCode || '').trim();
  const htmls = [...new Set(group.locations.map((loc) => loc.html).filter(Boolean))];
  const avoid = htmls[0] || '';
  const betterIsHtml = better.startsWith('<');
  const avoidIsHtml = avoid.startsWith('<');
  if (betterIsHtml && avoidIsHtml && avoid !== better) return { avoid, better };
  if (better) return { avoid: betterIsHtml && avoidIsHtml ? avoid : '', better };
  if (avoidIsHtml) return { avoid, better: '' };
  return { avoid: '', better: '' };
}

function buildScreenshotPanels(pageSize, markers) {
  const srcW = Math.max(1, pageSize.width);
  const srcH = Math.max(1, pageSize.height);
  const fullHeightMm = (srcH / srcW) * CONTENT_WIDTH_MM;

  const remap = (slice) => {
    const sliceMarkers = nudgeOverlapping(
      markers
        .filter((marker) => {
          if (!marker.hasBox) return false;
          const yPx = (marker.yPct / 100) * srcH;
          return yPx >= slice.yStart && yPx <= slice.yEnd;
        })
        .map((marker) => {
          const yPx = (marker.yPct / 100) * srcH;
          return {
            ...marker,
            yPct: ((yPx - slice.yStart) / Math.max(1, slice.sliceH)) * 100,
          };
        }),
    );
    const posY = srcH === slice.sliceH ? 0 : (slice.yStart / (srcH - slice.sliceH)) * 100;
    return {
      ...slice,
      srcW,
      srcH,
      aspect: `${srcW} / ${slice.sliceH}`,
      size: '100% auto',
      position: `0% ${posY.toFixed(3)}%`,
      markers: sliceMarkers,
    };
  };

  if (fullHeightMm <= PANEL_MAX_MM + 10) {
    return [remap({ yStart: 0, yEnd: srcH, sliceH: srcH, index: 0 })];
  }

  const sliceH = Math.round((PANEL_MAX_MM / CONTENT_WIDTH_MM) * srcW);
  const overlap = Math.round(sliceH * 0.06);
  const slices = [];
  let y = 0;
  let index = 0;
  while (y < srcH && index < 20) {
    const yEnd = Math.min(srcH, y + sliceH);
    slices.push({ yStart: y, yEnd, sliceH: yEnd - y, index });
    if (yEnd >= srcH) break;
    y = yEnd - overlap;
    index += 1;
  }

  const mapped = slices.map(remap);
  const useful = mapped.filter((panel) => panel.markers.length);
  const pool = useful.length ? useful : mapped.slice(0, 1);
  return pool
    .slice()
    .sort((a, b) => b.markers.length - a.markers.length)
    .slice(0, MAX_OVERVIEW_PANELS)
    .sort((a, b) => a.yStart - b.yStart)
    .map((panel, i, all) => ({
      ...panel,
      panelIndex: i + 1,
      panelCount: all.length,
    }));
}

/**
 * @param {object} scan  JSON returned by POST /audit
 * @param {{ tier?: string }} [options]
 */
export function buildReportDocument(scan, options = {}) {
  const tierId = options.tier && REPORT_TIERS[options.tier] ? options.tier : 'free';
  const tier = REPORT_TIERS[tierId];
  const issues = Array.isArray(scan?.issues) ? scan.issues : [];
  const summary = scan?.summary && typeof scan.summary === 'object'
    ? {
        crit: Number(scan.summary.crit) || 0,
        serious: Number(scan.summary.serious) || 0,
        moderate: Number(scan.summary.moderate) || 0,
        minor: Number(scan.summary.minor) || 0,
      }
    : tallySummary(issues);

  const groups = [];
  const byKey = new Map();
  issues.forEach((issue, index) => {
    const key = groupKey(issue);
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        ruleId: issue.ruleId || '',
        title: issue.title || 'Accessibility issue',
        severity: SEVERITY_ORDER.includes(issue.severity) ? issue.severity : 'minor',
        wcag: issue.wcag || '',
        why: issue.why || '',
        fixText: issue.fixText || '',
        fixCode: issue.fixCode || '',
        category: issue.category || '',
        locations: [],
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.locations.push(locationFromIssue(issue, index));
  });

  const pageSize = {
    width: Number(scan?.pageSize?.width) || 0,
    height: Number(scan?.pageSize?.height) || 0,
  };

  const maxDetailed = tier.maxDetailedGroups;
  const detailed = groups.slice(0, maxDetailed).map((group, i) => {
    const number = i + 1;
    const many = group.locations.length > 1;
    const locations = group.locations.map((loc, locIndex) => ({
      ...loc,
      label: many ? `${padGroup(number)}${letterSuffix(locIndex)}` : padGroup(number),
    }));
    const roles = ROLE_GUIDANCE[group.ruleId] || {};
    const wcag = group.wcag || '';
    const examples = codeExamples({ ...group, locations });
    const withDesign = Boolean(roles.design);
    const withDev = Boolean(roles.development);
    return {
      number,
      numberLabel: padGroup(number),
      title: group.title,
      severity: group.severity,
      wcag,
      wcagName: wcagName(wcag),
      why: group.why,
      happening: happeningText({ ...group, locations }),
      fixText: group.fixText,
      fixCode: group.fixCode,
      avoidCode: examples.avoid,
      betterCode: examples.better,
      design: withDesign && withDev ? roles.design : '',
      development: withDesign && withDev ? roles.development : '',
      category: group.category,
      ruleId: group.ruleId,
      locationCount: group.locations.length,
      locations: tier.includeAllLocationsInDetail ? locations : locations.slice(0, 12),
      allLocations: locations,
      crops: pickCrops(locations, pageSize, tier.maxCropsPerFinding),
    };
  });

  const remainingGroups = groups.slice(maxDetailed);
  const overflow = remainingGroups.map((group) => ({
    title: group.title,
    severity: group.severity,
    wcag: group.wcag,
    count: group.locations.length,
  }));
  const overflowIssueCount = remainingGroups.reduce((sum, group) => sum + group.locations.length, 0);

  const markers = nudgeOverlapping(
    detailed.flatMap((group) =>
      group.allLocations
        .filter((loc) => loc.hasBox)
        .map((loc) => {
          const box = loc.boundingBox;
          const srcW = pageSize.width || 1;
          const srcH = pageSize.height || 1;
          return {
            label: loc.label,
            hasBox: true,
            xPct: ((box.x + box.width / 2) / srcW) * 100,
            yPct: ((box.y + box.height / 2) / srcH) * 100,
            severity: group.severity,
          };
        }),
    ),
  );

  const priority = detailed
    .slice()
    .sort((a, b) => {
      const sev = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
      if (sev) return sev;
      return b.locationCount - a.locationCount;
    })
    .slice(0, detailed.length <= 3 ? detailed.length : Math.min(5, detailed.length));

  return {
    tier: tierId,
    standard: 'WCAG 2.2 AA',
    kind: 'Automated accessibility scan',
    url: typeof scan?.url === 'string' ? scan.url : '',
    host: hostFromUrl(scan?.url),
    scannedAt: typeof scan?.scannedAt === 'string' ? scan.scannedAt : '',
    scannedAtLabel: formatScanDate(scan?.scannedAt),
    screenshot: typeof scan?.screenshot === 'string' ? scan.screenshot : '',
    pageSize,
    issueCount: issues.length,
    summary,
    meaning: meaningSummary(issues.length, summary),
    detailed,
    overflow,
    overflowIssueCount,
    overflowGroupCount: overflow.length,
    markers,
    panels: buildScreenshotPanels(pageSize, markers),
    priority,
    learnUrl: `${SITE_ORIGIN}/learn-testing.html`,
    homeUrl: `${SITE_ORIGIN}/`,
  };
}
