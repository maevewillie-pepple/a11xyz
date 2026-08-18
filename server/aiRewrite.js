/**
 * Optional OpenAI layer. Not used.
 * Plain-language copy comes from the rule lookup in plainLanguage.js
 * so reports stay fast, free, and deterministic.
 */
export async function rewriteViolations(_violations) {
  return _violations;
}
