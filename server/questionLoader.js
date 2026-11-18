'use strict';

const fs = require('fs');
const path = require('path');

const QUESTIONS_DIR = path.join(__dirname, '..', 'data', 'questions');

// ---------- Loading ----------

function loadQuestionsFromDisk() {
  const categoryData = [];

  if (!fs.existsSync(QUESTIONS_DIR)) {
    console.warn(`[questionLoader] Questions directory not found: ${QUESTIONS_DIR}`);
    return categoryData;
  }

  const files = fs
    .readdirSync(QUESTIONS_DIR)
    .filter((file) => file.toLowerCase().endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(QUESTIONS_DIR, file);
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);

      if (!data || typeof data.category !== 'string' || !Array.isArray(data.prompts)) {
        console.warn(`[questionLoader] Skipping ${file}: missing "category" or "prompts".`);
        continue;
      }

      categoryData.push(data);
    } catch (err) {
      console.error(`[questionLoader] Failed to parse ${file}: ${err.message}`);
    }
  }

  return categoryData;
}

// Read everything synchronously once, at startup.
const QUESTION_DATA = loadQuestionsFromDisk();

// ---------- Exported API ----------

/**
 * Returns an array of available category names (strings).
 */
function getCategories() {
  return QUESTION_DATA.map((entry) => entry.category);
}

/**
 * Returns a random prompt object ({ id, prompt, answers }) from the given
 * category. Pass "All" (or omit) to draw from every category.
 * Prompts whose id is in excludeIds are skipped; if everything is excluded,
 * falls back to the full pool so the game can keep going.
 * Returns null when there is no question data at all.
 */
function getRandomPrompt(categoryName, excludeIds = []) {
  let pool;

  if (!categoryName || categoryName === 'All') {
    pool = QUESTION_DATA.flatMap((entry) => entry.prompts);
  } else {
    const entry = QUESTION_DATA.find((c) => c.category === categoryName);
    pool = entry ? entry.prompts : [];
  }

  if (pool.length === 0) return null;

  const excluded = new Set(excludeIds);
  const filtered = pool.filter((p) => !excluded.has(p.id));
  const source = filtered.length > 0 ? filtered : pool;

  return source[Math.floor(Math.random() * source.length)];
}

/**
 * Normalize a string for comparison:
 * lowercase, strip punctuation, collapse whitespace, trim.
 */
function normalize(str) {
  return String(str == null ? '' : str)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation
    .replace(/\s+/g, ' ')         // collapse extra spaces
    .trim();
}

/**
 * Classic Levenshtein edit distance.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  let previous = new Array(bLen + 1);
  let current = new Array(bLen + 1);

  for (let j = 0; j <= bLen; j++) previous[j] = j;

  for (let i = 1; i <= aLen; i++) {
    current[0] = i;
    for (let j = 1; j <= bLen; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,      // insert
        previous[j] + 1,         // delete
        previous[j - 1] + cost   // substitute
      );
    }
    const tmp = previous;
    previous = current;
    current = tmp;
  }

  return previous[bLen];
}

/**
 * Check a user's answer against a prompt.
 *
 * - Normalizes both sides.
 * - Exact match against each answer's `answer` and any `aliases`.
 * - Otherwise allows Levenshtein distance <= 1 for candidates of 5+ chars.
 * - usedAnswersSet holds previously matched answers (normalized or raw);
 *   matched answers found in the set come back with reason 'used'.
 *
 * Returns { valid, reason: 'ok' | 'used' | 'invalid', matchedAnswer?, rarity? }
 */
function validateAnswer(promptObj, userInput, usedAnswersSet) {
  const normalizedInput = normalize(userInput);
  if (!promptObj || !Array.isArray(promptObj.answers) || normalizedInput.length === 0) {
    return { valid: false, reason: 'invalid' };
  }

  // Normalize the used-answers set once so it works no matter how entries were stored.
  const used = new Set();
  if (usedAnswersSet && typeof usedAnswersSet.forEach === 'function') {
    usedAnswersSet.forEach((entry) => used.add(normalize(entry)));
  }

  let fuzzyMatch = null;

  for (const answerEntry of promptObj.answers) {
    const candidates = [answerEntry.answer, ...(Array.isArray(answerEntry.aliases) ? answerEntry.aliases : [])];

    for (const candidate of candidates) {
      const normalizedCandidate = normalize(candidate);
      if (normalizedCandidate.length === 0) continue;

      // Exact match.
      if (normalizedCandidate === normalizedInput) {
        return finalize(answerEntry, normalizedCandidate, used);
      }

      // Typo tolerance: distance <= 1, but only for candidates of 5+ chars.
      if (
        !fuzzyMatch &&
        normalizedCandidate.length >= 5 &&
        levenshtein(normalizedInput, normalizedCandidate) <= 1
      ) {
        fuzzyMatch = { answerEntry, normalizedCandidate };
      }
    }
  }

  if (fuzzyMatch) {
    return finalize(fuzzyMatch.answerEntry, fuzzyMatch.normalizedCandidate, used);
  }

  return { valid: false, reason: 'invalid' };
}

function finalize(answerEntry, normalizedCandidate, used) {
  const result = {
    matchedAnswer: answerEntry.answer,
    rarity: answerEntry.rarity,
  };

  if (used.has(normalizedCandidate)) {
    return { ...result, valid: false, reason: 'used' };
  }

  return { ...result, valid: true, reason: 'ok' };
}

module.exports = {
  getCategories,
  getRandomPrompt,
  validateAnswer,
  normalize, // exported for convenience/testing
};
