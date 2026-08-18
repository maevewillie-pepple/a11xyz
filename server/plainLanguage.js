/**
 * Plain-language copy for common axe-core rules.
 * Chosen over OpenAI: no API key, instant, deterministic, matches Aria's tone.
 * Unknown rules fall back to a light rewrite of axe help text (not the raw description).
 */
const RULES = {
  'color-contrast': {
    category: 'Colour contrast',
    wcag: '1.4.3',
    title: 'Text contrast is below the AA minimum',
    why: 'Contrast is how different the text colour is from the background. If the ratio is too low, letters blend into the page. Low vision users, and anyone in bright light, cannot read this text comfortably.',
    fixText: 'Darken the text or lighten the background until the contrast ratio is at least 4.5:1 (3:1 for large text).',
    fixCode: 'color: #17160F;\nbackground: #FFFFFF;',
  },
  'color-contrast-enhanced': {
    category: 'Colour contrast',
    title: 'Text contrast is below the AAA minimum',
    why: 'AAA contrast is a stricter version of the same idea: text must stand out even more from its background (7:1, or 4.5:1 for large type). Low vision users need that extra difference to read it.',
    fixText: 'Increase contrast to at least 7:1 (4.5:1 for large text).',
    fixCode: 'color: #17160F;\nbackground: #FFFFFF;',
  },
  'image-alt': {
    category: 'Missing ARIA & labels',
    wcag: '1.1.1',
    title: 'Image has no alt text',
    why: 'Alt text is a short written name for an image. Screen readers read it aloud in place of the picture. Without it, the image is skipped or announced as a filename, so the meaning is lost.',
    fixText: 'Add alt text that describes the image, or alt="" if it is decorative.',
    fixCode: '<img src="photo.jpg" alt="A short description">',
  },
  'input-image-alt': {
    category: 'Missing ARIA & labels',
    title: 'Image button has no alt text',
    why: 'An image button is a picture that submits a form. Its accessible name (usually alt text) is what screen readers announce as the action, for example "Search". Without that name it is just "button".',
    fixText: 'Add alt text that describes the action, for example "Search".',
    fixCode: '<input type="image" alt="Search" src="search.svg">',
  },
  'area-alt': {
    category: 'Missing ARIA & labels',
    title: 'Image map area has no alt text',
    why: 'An image map splits one picture into clickable regions. Each region needs alt text so a screen reader can say where that patch of the image goes, the same way a normal link has words.',
    fixText: 'Add an alt attribute that describes the link destination.',
    fixCode: '<area shape="rect" coords="0,0,100,100" href="/about" alt="About us">',
  },
  'object-alt': {
    category: 'Missing ARIA & labels',
    title: 'Embedded object has no text alternative',
    why: 'An <object> embeds a file such as a PDF. Fallback text inside it is the accessible name: what is announced if the embed cannot be used. Without it, screen reader users only hear "object".',
    fixText: 'Put a short text alternative inside the object element.',
    fixCode: '<object data="file.pdf">Download the PDF</object>',
  },
  'svg-img-alt': {
    category: 'Missing ARIA & labels',
    title: 'SVG image has no accessible name',
    why: 'When an SVG is used as an image, it still needs an accessible name, via aria-label or a <title> inside the SVG. That name is what a screen reader says instead of "image".',
    fixText: 'Add aria-label, or a <title> inside the SVG.',
    fixCode: '<svg role="img" aria-label="Company logo">…</svg>',
  },
  'role-img-alt': {
    category: 'Missing ARIA & labels',
    title: 'Element with role="img" has no accessible name',
    why: 'role="img" tells assistive tech "treat this as a picture". A role without a name is announced as an unnamed image. aria-label (or labelledby) is the title that describes what the graphic shows.',
    fixText: 'Add aria-label or aria-labelledby that describes the image.',
    fixCode: '<div role="img" aria-label="Sales chart"></div>',
  },
  'button-name': {
    category: 'Missing ARIA & labels',
    wcag: '4.1.2',
    title: 'Button has no accessible name',
    why: 'A button\'s accessible name is the words a screen reader speaks, taken from visible text, aria-label, or labelledby. Icon-only buttons with no name are announced as "button", so nobody hears whether it closes, plays, or submits.',
    fixText: 'Add visible text, aria-label, or aria-labelledby that names the action.',
    fixCode: '<button aria-label="Close">\n  <svg>…</svg>\n</button>',
  },
  'link-name': {
    category: 'Vague link text',
    wcag: '2.4.4',
    title: 'Link has no accessible name',
    why: 'A link\'s accessible name is the phrase read out for it, from its text, an image\'s alt, or aria-label. Screen reader users often jump a list of all links. Nameless links all sound the same, so the destination is unknown.',
    fixText: 'Use visible text, alt text on an image, or aria-label that describes the destination.',
    fixCode: '<a href="/pricing">See pricing</a>',
  },
  'input-button-name': {
    category: 'Missing ARIA & labels',
    title: 'Input button has no accessible name',
    why: 'The value on an <input type="submit"> is its accessible name, the same job a <button>\'s text does. Screen readers announce that name as the action. An empty value is heard as a blank button.',
    fixText: 'Set the value attribute to the action, for example "Send".',
    fixCode: '<input type="submit" value="Send message">',
  },
  'label': {
    category: 'Unlabelled form fields',
    wcag: '1.3.1',
    title: 'Form field is missing a label',
    why: 'A label is the visible (or aria) name of a field: "Email", "Password". It is what screen readers announce on focus, and what clicking the text focuses. A placeholder is not a label; once you type, it disappears and the field has no name.',
    fixText: 'Associate a <label> with the input using for/id, or wrap the input in a label.',
    fixCode: '<label for="email">Email</label>\n<input id="email" type="email">',
  },
  'select-name': {
    category: 'Unlabelled form fields',
    title: 'Select menu is missing a label',
    why: 'A select needs a label the same way an input does: a name for the choice, such as "Country". Screen readers announce that label when the menu is focused. Without it, users only hear "combo box" or "menu".',
    fixText: 'Add a <label> linked to the select, or aria-label.',
    fixCode: '<label for="country">Country</label>\n<select id="country">…</select>',
  },
  'form-field-multiple-labels': {
    category: 'Unlabelled form fields',
    title: 'Form field has more than one label',
    why: 'One field should have one label. If two <label> elements point at the same input, screen readers often join the words into a confusing name, so it is unclear what to type.',
    fixText: 'Keep a single label per field.',
    fixCode: '<label for="name">Full name</label>\n<input id="name">',
  },
  'frame-title': {
    category: 'Missing ARIA & labels',
    title: 'iframe has no title',
    why: 'An iframe is a page inside the page. Its title attribute is the name of that nested document, like a tab title. Screen readers announce "frame" plus the title so people can decide whether to enter it. No title means an unnamed frame.',
    fixText: 'Add a title that describes the frame contents.',
    fixCode: '<iframe src="/embed" title="Product demo video"></iframe>',
  },
  'document-title': {
    category: 'Heading & structure',
    wcag: '2.4.2',
    title: 'Page is missing a title',
    why: 'The document title (<title> in the head) is the name of the whole page. It appears in the browser tab, in history, and is the first thing a screen reader says on load. Without it, every tab sounds like the URL.',
    fixText: 'Add a unique, descriptive <title> in the document head.',
    fixCode: '<title>Pricing · Aria</title>',
  },
  'html-has-lang': {
    category: 'Heading & structure',
    wcag: '3.1.1',
    title: 'Page language is not set',
    why: 'The lang attribute on <html> tells assistive tech and browsers which language the page is in, for example en or en-GB. Screen readers use it to pick a voice and pronunciation. Missing lang often means English words read as if they were another language.',
    fixText: 'Add a lang attribute on the html element.',
    fixCode: '<html lang="en">',
  },
  'html-lang-valid': {
    category: 'Heading & structure',
    title: 'Page language is not a valid code',
    why: 'lang must be a real language code (en, en-GB, cy). An invalid value is ignored, so the screen reader does not know which voice to use and may mispronounce the page.',
    fixText: 'Use a valid BCP 47 language code such as en or en-GB.',
    fixCode: '<html lang="en">',
  },
  'page-has-heading-one': {
    category: 'Heading & structure',
    title: 'Page has no h1 heading',
    why: 'Headings (<h1>–<h6>) are the outline of the page. Screen reader users jump heading to heading the way a sighted person scans titles. An h1 is the top of that outline: the name of the page. Without one, there is no start point.',
    fixText: 'Add one h1 that names the page.',
    fixCode: '<h1>Your page title</h1>',
  },
  'heading-order': {
    category: 'Heading & structure',
    wcag: '1.3.1',
    title: 'Heading levels are skipped',
    why: 'Heading levels nest like a table of contents: h1 for the page, h2 for sections, h3 for subsections. Skipping from h1 to h4 breaks that outline, so a screen reader\'s heading list no longer matches the real structure.',
    fixText: 'Use headings in order: h1, then h2, then h3, without jumps.',
    fixCode: '<h1>Pricing</h1>\n<h2>Starter plan</h2>',
  },
  'empty-heading': {
    category: 'Heading & structure',
    title: 'Heading is empty',
    why: 'A heading element is a labelled section title. If it is empty, screen readers still announce "heading" with no words, so people hear a section that does not exist.',
    fixText: 'Put text in the heading, or remove it if it is not needed.',
    fixCode: '<h2>Section title</h2>',
  },
  'landmark-one-main': {
    category: 'Heading & structure',
    wcag: '1.3.1',
    title: 'Page is missing a main landmark',
    why: 'A landmark is a named region of the page (banner, navigation, main, complementary, contentinfo). Screen readers offer a list of landmarks so people can skip the chrome and go straight to content. <main> is the landmark for the unique page content. Without it, there is no "skip to the article" target.',
    fixText: 'Wrap the primary content in a <main> element, and only one of them.',
    fixCode: '<main>\n  …page content…\n</main>',
  },
  'region': {
    category: 'Heading & structure',
    wcag: '1.3.1',
    title: 'Content is not inside a landmark',
    why: 'Landmarks are the page\'s regions: header, nav, main, aside, footer (or ARIA roles that mean the same). Everything people need to find should sit inside one of them. Content left outside has no region name, so it does not appear in a landmark list and is easy to miss.',
    fixText: 'Place content in <header>, <nav>, <main>, <aside>, or <footer>.',
    fixCode: '<main>\n  <article>…</article>\n</main>',
  },
  'bypass': {
    category: 'No keyboard support',
    title: 'No way to skip repeated navigation',
    why: 'A skip link is a hidden-until-focused control, usually "Skip to content", that jumps keyboard users past repeated header links. A main landmark does the same job for screen readers. Without either, every page starts with tabbing through the whole nav.',
    fixText: 'Add a skip link to main content, or a main landmark.',
    fixCode: '<a href="#main">Skip to content</a>\n<main id="main">…</main>',
  },
  'tabindex': {
    category: 'No keyboard support',
    title: 'Positive tabindex changes focus order',
    why: 'tabindex controls whether an element can be focused with the keyboard, and in what order. 0 means "in document order"; -1 means "focusable by script only". A positive number (1, 2, 3…) pulls the control to the front of the queue and makes the rest of the page unpredictable.',
    fixText: 'Remove positive tabindex values. Use 0 or -1 only if you must.',
    fixCode: '<button>Save</button>',
  },
  'scrollable-region-focusable': {
    category: 'No keyboard support',
    title: 'Scrollable region cannot be focused',
    why: 'A scrollable box can only be scrolled with the keyboard if it, or something inside it, can take focus. Otherwise keyboard users can see that content is cut off and have no way to reach it without a mouse.',
    fixText: 'Add tabindex="0" to the scrollable container, or make sure it contains a focusable element.',
    fixCode: '<div class="scroll" tabindex="0">…</div>',
  },
  'nested-interactive': {
    category: 'No keyboard support',
    title: 'Interactive elements are nested',
    why: 'Interactive elements (links, buttons, inputs) should not wrap each other. A link inside a button is two controls in one place: keyboard and screen readers fire both, or get stuck. Each clickable thing should be one element with one role.',
    fixText: 'Keep one interactive element. Move the inner control out, or make the outer element non-interactive.',
    fixCode: '<a href="/item">View item</a>',
  },
  'target-size': {
    category: 'No keyboard support',
    title: 'Tap target is smaller than 24px',
    why: 'A tap target is the clickable area of a control. WCAG asks for at least 24 by 24 pixels so people with motor impairments, or anyone on a phone, can hit it without slipping onto a neighbour.',
    fixText: 'Make the clickable area at least 24 by 24 CSS pixels.',
    fixCode: 'button { min-width: 24px; min-height: 24px; }',
  },
  'meta-viewport': {
    category: 'No keyboard support',
    title: 'Zoom is disabled on this page',
    why: 'The viewport meta tag tells mobile browsers how to scale the page. user-scalable=no or a low maximum-scale turns off pinch-zoom. Low vision users rely on zoom to enlarge text and controls; locking it leaves the page unreadable.',
    fixText: 'Remove user-scalable=no and allow maximum-scale of at least 2.',
    fixCode: '<meta name="viewport" content="width=device-width, initial-scale=1">',
  },
  'link-in-text-block': {
    category: 'Vague link text',
    title: 'Link is not distinct from surrounding text',
    why: 'In a paragraph, a link has to be visible as a link, not only a different colour. Underline (or another shape cue) is what low vision and colour-blind readers use. Colour alone is not a name, and not a reliable marker.',
    fixText: 'Underline the link, or another visual cue besides colour.',
    fixCode: 'a { text-decoration: underline; }',
  },
  'list': {
    category: 'Heading & structure',
    title: 'List markup is broken',
    why: 'A list (<ul>, <ol>, <li>) is a structure screen readers announce as "list, N items" so people can skip or step through it. Extra wrappers or stray tags break that structure, and it is read as ordinary text instead.',
    fixText: 'Use <ul> or <ol> with <li> children only, not extra wrappers.',
    fixCode: '<ul>\n  <li>First</li>\n  <li>Second</li>\n</ul>',
  },
  'listitem': {
    category: 'Heading & structure',
    title: 'List item is not inside a list',
    why: '<li> only means "list item" when it sits inside <ul> or <ol>. On its own it is not part of a list, so screen readers will not announce a list or a position such as "2 of 5".',
    fixText: 'Wrap list items in <ul> or <ol>.',
    fixCode: '<ul>\n  <li>Item</li>\n</ul>',
  },
  'duplicate-id-aria': {
    category: 'Missing ARIA & labels',
    title: 'ID used in ARIA is duplicated',
    why: 'id is the hook other attributes use. aria-labelledby="price" means "use the element with id price as my name". If two elements share that id, the browser does not know which name to use, so the label can be wrong or empty.',
    fixText: 'Give each element a unique id.',
    fixCode: '<h2 id="pricing-heading">Pricing</h2>',
  },
  'duplicate-id-active': {
    category: 'No keyboard support',
    title: 'Focusable element has a duplicate id',
    why: 'id must be unique on the page. Labels use for="…" to point at an input\'s id; duplicate ids make that pointer ambiguous, so the wrong field (or none) gets the name, and keyboard focus can land somewhere unexpected.',
    fixText: 'Make every id unique, especially on inputs and buttons.',
    fixCode: '<input id="email">',
  },
  'aria-hidden-focus': {
    category: 'No keyboard support',
    title: 'Hidden content is still focusable',
    why: 'aria-hidden="true" means "ignore this for assistive tech". If a button or link inside it can still be tabbed to, keyboard users land on a control that screen readers have been told does not exist. Hide it from both, or from neither.',
    fixText: 'Do not focus elements inside aria-hidden, or remove them from the tab order with tabindex="-1" and inert/hidden.',
    fixCode: '<div aria-hidden="true">\n  <!-- no buttons or links in here -->\n</div>',
  },
  'aria-command-name': {
    category: 'Missing ARIA & labels',
    title: 'Custom control has no accessible name',
    why: 'A role such as button, link, or menuitem tells assistive tech what the control is. The accessible name (aria-label or labelledby) is what it does: "Play", "Close". A role with no name is announced as an unnamed control, so it cannot be used with confidence.',
    fixText: 'Add aria-label or aria-labelledby.',
    fixCode: '<div role="button" aria-label="Play" tabindex="0"></div>',
  },
  'aria-input-field-name': {
    category: 'Unlabelled form fields',
    title: 'Custom input has no accessible name',
    why: 'role="textbox" (or similar) is a custom input. Like a native <input>, it needs an accessible name so screen readers can say what to type. Without a label or aria-label, it is announced as an empty edit field.',
    fixText: 'Add aria-label or aria-labelledby.',
    fixCode: '<div role="textbox" aria-label="Search" contenteditable="true"></div>',
  },
  'aria-progressbar-name': {
    category: 'Missing ARIA & labels',
    title: 'Progress bar has no accessible name',
    why: 'role="progressbar" is a status widget. Its accessible name says what is in progress ("Uploading photo"). aria-valuenow is the amount. A nameless progress bar is just "progressbar, 40 percent" with no idea of what.',
    fixText: 'Add aria-label describing the process.',
    fixCode: '<div role="progressbar" aria-label="Uploading" aria-valuenow="40"></div>',
  },
  'aria-toggle-field-name': {
    category: 'Missing ARIA & labels',
    title: 'Toggle has no accessible name',
    why: 'A switch or checkbox role is a toggle. Its accessible name is the setting it controls ("Notifications"). Screen readers announce name plus on/off. With no name, people hear "switch, on" and not what they changed.',
    fixText: 'Add aria-label or a visible label.',
    fixCode: '<div role="switch" aria-label="Notifications" aria-checked="true"></div>',
  },
  'aria-tooltip-name': {
    category: 'Missing ARIA & labels',
    title: 'Tooltip has no accessible name',
    why: 'role="tooltip" marks extra hint text tied to a control. The accessible name is that hint. An empty tooltip is announced as "tooltip" with no words, so the extra help never arrives.',
    fixText: 'Put the tooltip text in the element, or aria-label.',
    fixCode: '<div role="tooltip">Saved just now</div>',
  },
  'meta-refresh': {
    category: 'No keyboard support',
    title: 'Page refreshes or redirects automatically',
    why: 'A meta refresh reloads or redirects the page after a timer. It steals focus and resets place in the document. People who read slowly, or use a keyboard, can lose their work or never reach the content they started.',
    fixText: 'Remove the meta refresh. Let people choose when to move on.',
    fixCode: '<!-- no <meta http-equiv="refresh"> -->',
  },
  'blink': {
    category: 'No keyboard support',
    title: 'Blinking content is present',
    why: 'The obsolete <blink> element flashes text on and off. Flashing is hard to read and can trigger seizures. There is no pause control. Static text does the same job without the motion.',
    fixText: 'Remove the blink element. Use a static alternative.',
    fixCode: '<p>Important update</p>',
  },
  'marquee': {
    category: 'No keyboard support',
    title: 'Marquee content is present',
    why: '<marquee> scrolls text that cannot be paused. Moving text is difficult for people with cognitive or visual differences, and for anyone trying to read at their own pace. Put the same words in a normal paragraph.',
    fixText: 'Remove the marquee. Show the text statically.',
    fixCode: '<p>Next event: 12 May</p>',
  },
  'video-caption': {
    category: 'Missing ARIA & labels',
    title: 'Video has no captions',
    why: 'Captions are a timed text track of speech and important sound in a video. Deaf and hard-of-hearing viewers, and anyone watching without audio, read them instead of hearing the soundtrack.',
    fixText: 'Provide captions via a track element or a player that supports them.',
    fixCode: '<video>\n  <track kind="captions" src="captions.vtt" srclang="en">\n</video>',
  },
  'audio-caption': {
    category: 'Missing ARIA & labels',
    title: 'Audio has no transcript or captions',
    why: 'A transcript is a written version of spoken audio. Captions do the same for timed media. Without one, Deaf and hard-of-hearing people cannot access the recording at all.',
    fixText: 'Add a transcript on the page, or captions if it is timed media.',
    fixCode: '<audio src="episode.mp3" controls></audio>\n<p>Transcript: …</p>',
  },
};

function humanizeRuleId(id) {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function firstUsefulLine(failureSummary) {
  if (!failureSummary) return '';
  const line = failureSummary
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part && !/^fix (any|all) of the following/i.test(part));
  return line ? line.replace(/^[:\-•]\s*/, '') : '';
}

function snippet(html) {
  if (!html) return '';
  const compact = html.replace(/\s+/g, ' ').trim();
  return compact.length > 220 ? `${compact.slice(0, 217)}…` : compact;
}

function contrastTitle(node, fallback) {
  const data = node?.any?.[0]?.data;
  const ratio = data?.contrastRatio;
  if (typeof ratio === 'number' && Number.isFinite(ratio)) {
    return `Text contrast ${ratio.toFixed(1)}:1, below AA minimum`;
  }
  return fallback;
}

export function copyForRule(ruleId, violation, node) {
  const entry = RULES[ruleId];
  if (entry) {
    return {
      category: entry.category,
      wcag: entry.wcag || '',
      title: ruleId === 'color-contrast' ? contrastTitle(node, entry.title) : entry.title,
      why: entry.why,
      fixText: entry.fixText,
      fixCode: entry.fixCode,
    };
  }

  const help = (violation.help || '').trim();
  const description = (violation.description || '').trim();
  const fromFailure = firstUsefulLine(node?.failureSummary);

  return {
    category: humanizeRuleId(ruleId),
    wcag: '',
    title: help || humanizeRuleId(ruleId),
    why: description
      ? `${description.replace(/\.$/, '')}. Assistive tech uses names, roles, and structure like this to describe the page; without them the control or region has no usable identity.`
      : 'Assistive tech uses names, roles, and structure to describe the page. This element is missing that information, so it cannot be used reliably.',
    fixText: fromFailure || 'Update this element so it meets the WCAG criterion listed.',
    fixCode: snippet(node?.html),
  };
}
