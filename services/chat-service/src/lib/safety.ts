/**
 * Lightweight screen for messages that may signal a crisis (self-harm / suicide).
 * It does not block the conversation; it makes the assistant respond with extra care
 * and tells the client to show support resources. It is a safety net, not a classifier.
 */
const PATTERNS: RegExp[] = [
  // English
  /\b(kill(ing)? myself|end(ing)? my (own )?life|suicid\w*|want to die|wanna die|better off dead|hurt(ing)? myself|harm(ing)? myself|self[- ]?harm|cut(ting)? myself|no reason to (live|go on)|don'?t want to (live|be alive|be here))\b/i,
  // French
  /(me suicider|suicid\w*|envie de mourir|veux mourir|mettre fin à (mes jours|ma vie)|me faire du mal|me blesser|plus envie de vivre|en finir avec (la vie|tout))/i,
  // Arabic
  /(انتحار|أنتحر|انتحر|أقتل نفسي|اقتل نفسي|أريد أن أموت|اريد ان اموت|إنهاء حياتي|انهاء حياتي|أؤذي نفسي|اؤذي نفسي|لا أريد أن أعيش|لا اريد ان اعيش)/,
];

export function detectCrisis(text: string): boolean {
  const normalized = text.replace(/[’‘]/g, "'");
  return PATTERNS.some((p) => p.test(normalized));
}
