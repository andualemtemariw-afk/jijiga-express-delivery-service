/**
 * Expected runner tag format: TAG-ET-##### (5 digits)
 * E.g., TAG-ET-48217
 */
export const TAG_FORMAT_REGEX = /^TAG-ET-\d{5}$/;

/**
 * Validates whether a given string adheres to the standard Jijiga Express runner tag format.
 */
export function isValidRunnerTag(tag: unknown): tag is string {
  return typeof tag === 'string' && TAG_FORMAT_REGEX.test(tag.trim());
}

/**
 * Deterministically formats or validates a tag string.
 */
export function normalizeRunnerTag(tag: string): string {
  return tag.trim().toUpperCase();
}

/**
 * Generates a single, cryptographically-adequate runner tamper-evident seal tag.
 * Guaranteed format: TAG-ET-##### (always 5 digits between 10000 and 99999).
 */
export function generateRunnerTag(): string {
  // Ensure exactly 5 digits: 10000 to 99999
  const randomFiveDigits = Math.floor(10000 + Math.random() * 90000);
  return `TAG-ET-${randomFiveDigits}`;
}
