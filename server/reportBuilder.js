import { copyForRule } from './plainLanguage.js';

const IMPACT_TO_SEVERITY = {
  critical: 'crit',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
};

function mapSeverity(impact) {
  return IMPACT_TO_SEVERITY[impact] || 'minor';
}

function wcagFromTags(tags) {
  if (!Array.isArray(tags)) return '';
  for (const tag of tags) {
    const match = /^wcag(\d)(\d)(\d)$/i.exec(tag);
    if (match) return `${match[1]}.${match[2]}.${match[3]}`;
  }
  return '';
}

function roundBox(box) {
  if (!box) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

function snippetHtml(html) {
  if (!html) return '';
  const compact = String(html).replace(/\s+/g, ' ').trim();
  return compact.length > 240 ? `${compact.slice(0, 237)}...` : compact;
}

/**
 * Split axe-core's rule-grouped violations into one issue per element,
 * sorted in document (reading) order.
 */
export function buildReport({ url, nodes, pageSize, screenshotUrl }) {
  const issues = nodes
    .slice()
    .sort((a, b) => {
      if (a.documentIndex !== b.documentIndex) return a.documentIndex - b.documentIndex;
      const ay = a.boundingBox?.y ?? 0;
      const by = b.boundingBox?.y ?? 0;
      if (ay !== by) return ay - by;
      return (a.boundingBox?.x ?? 0) - (b.boundingBox?.x ?? 0);
    })
    .map((node) => {
      const copy = copyForRule(node.ruleId, node, node);
      return {
        ruleId: node.ruleId || '',
        severity: mapSeverity(node.impact),
        category: copy.category,
        wcag: wcagFromTags(node.tags) || copy.wcag || '',
        title: copy.title,
        selector: node.selector,
        html: snippetHtml(node.html),
        why: copy.why,
        fixText: copy.fixText,
        fixCode: copy.fixCode,
        boundingBox: roundBox(node.boundingBox),
      };
    });

  const summary = { crit: 0, serious: 0, moderate: 0, minor: 0 };
  for (const issue of issues) {
    if (summary[issue.severity] !== undefined) summary[issue.severity] += 1;
  }

  return {
    url,
    scannedAt: new Date().toISOString(),
    summary,
    screenshot: screenshotUrl,
    pageSize,
    issues,
  };
}
