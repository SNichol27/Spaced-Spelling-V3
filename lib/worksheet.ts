import { shuffle } from '@/lib/random';

export type WorksheetWord = {
  word: string;
  definition: string;
};

export type WorksheetQuestion = {
  word: string;
  definition: string;
  options: string[];
  answer: string;
};

export type MatchingDefinition = {
  letter: string;
  definition: string;
};

export type MatchingData = {
  words: string[];
  definitions: MatchingDefinition[];
  answers: Record<string, string>;
};

const fallbackDefinition = 'A word used in reading and writing.';

function preserveWordCasing(sourceWord: string, candidate: string): string {
  if (!sourceWord) return candidate;
  if (sourceWord === sourceWord.toUpperCase()) return candidate.toUpperCase();
  if (sourceWord[0] === sourceWord[0].toUpperCase()) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }
  return candidate;
}

function addMisspelling(set: Set<string>, originalWord: string, candidate: string) {
  const normalizedCandidate = candidate.toLowerCase().trim();
  if (!normalizedCandidate || normalizedCandidate === originalWord.toLowerCase()) {
    return;
  }
  set.add(preserveWordCasing(originalWord, normalizedCandidate));
}

function swapAt(word: string, index: number, replacement: string) {
  return `${word.slice(0, index)}${replacement}${word.slice(index + 1)}`;
}

export function generatePhoneticMisspellings(word: string): string[] {
  if (!word) {
    return [];
  }
  const misspellings = new Set<string>();
  const lowerWord = word.toLowerCase().trim();

  if (!lowerWord) {
    return [];
  }

  const vowelMap: Record<string, string[]> = {
    a: ['ay', 'ae', 'ai'],
    e: ['ea', 'ee', 'ie'],
    i: ['ie', 'y', 'igh'],
    o: ['oa', 'oe', 'ow'],
    u: ['oo', 'ou', 'ew']
  };

  for (let index = 0; index < lowerWord.length; index += 1) {
    const char = lowerWord[index];
    const replacements = vowelMap[char];
    if (!replacements) continue;
    for (const replacement of replacements) {
      addMisspelling(misspellings, word, swapAt(lowerWord, index, replacement));
      if (misspellings.size >= 3) break;
    }
    if (misspellings.size >= 3) break;
  }

  const consonantMap: Record<string, string[]> = {
    c: ['k', 'ck', 'ch'],
    k: ['c', 'ck'],
    s: ['z', 'ss', 'c'],
    z: ['s', 'ss'],
    f: ['ph', 'ff', 'v'],
    v: ['f', 'ph'],
    j: ['g', 'dge'],
    g: ['j', 'dge'],
    ch: ['tch'],
    sh: ['ch'],
    th: ['f'],
    ph: ['f', 'v'],
    ck: ['c', 'k']
  };

  for (const [source, replacements] of Object.entries(consonantMap)) {
    const sourceIndex = lowerWord.indexOf(source);
    if (sourceIndex === -1) continue;
    for (const replacement of replacements) {
      addMisspelling(
        misspellings,
        word,
        `${lowerWord.slice(0, sourceIndex)}${replacement}${lowerWord.slice(sourceIndex + source.length)}`
      );
      if (misspellings.size >= 3) break;
    }
    if (misspellings.size >= 3) break;
  }

  if (lowerWord.includes('gh')) addMisspelling(misspellings, word, lowerWord.replace('gh', 'h'));
  if (lowerWord.includes('ght')) addMisspelling(misspellings, word, lowerWord.replace('ght', 't'));
  if (lowerWord.includes('kn')) addMisspelling(misspellings, word, lowerWord.replace('kn', 'n'));
  if (lowerWord.includes('wr')) addMisspelling(misspellings, word, lowerWord.replace('wr', 'r'));

  for (let index = 1; index < lowerWord.length - 1; index += 1) {
    const isShortVowel = 'aeiou'.includes(lowerWord[index]);
    const nextLetter = lowerWord[index + 1];
    if (!isShortVowel || !'bcdfghjklmnpqrstvwxyz'.includes(nextLetter)) continue;
    addMisspelling(
      misspellings,
      word,
      `${lowerWord.slice(0, index + 1)}${nextLetter}${lowerWord.slice(index + 1)}`
    );
    if (misspellings.size >= 3) break;
  }

  const patternFallbacks = [
    lowerWord.replace(/ing$/, 'in'),
    lowerWord.replace(/ed$/, 'd'),
    lowerWord.replace(/ly$/, 'le'),
    lowerWord.replace(/tion$/, 'shun'),
    lowerWord.replace(/sion$/, 'shun')
  ];

  for (const candidate of patternFallbacks) {
    addMisspelling(misspellings, word, candidate);
    if (misspellings.size >= 3) break;
  }

  if (misspellings.size < 3 && lowerWord.length > 2) {
    const chars = lowerWord.split('');
    [chars[chars.length - 2], chars[chars.length - 1]] = [chars[chars.length - 1], chars[chars.length - 2]];
    addMisspelling(misspellings, word, chars.join(''));
  }

  return shuffle(Array.from(misspellings)).slice(0, 3);
}

const OPENAI_FETCH_TIMEOUT_MS = 8000;

export async function getDefinition(word: string, openAiKey: string): Promise<string> {
  if (!openAiKey) {
    console.warn('[OPENAI_CONFIG_MISSING] OPENAI_API_KEY not set; skipping AI definition generation');
    return fallbackDefinition;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', openAiKey].join(' ')
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that creates very simple, short definitions for 8-year-olds. Write ONLY one short sentence (max 10 words). Use very simple words. NEVER include the word being defined anywhere in the definition. Do not add any explanation or extra text, just the definition.'
          },
          {
            role: 'user',
            content: `Write a one-sentence definition (max 10 words) for "${word}" for an 8-year-old. NEVER use the word "${word}" in the definition. Just write the definition, nothing else.`
          }
        ],
        max_tokens: 30,
        temperature: 0.5
      })
    });

    if (!response.ok) {
      console.warn('[OPENAI_API_ERROR] OpenAI request failed', { word, status: response.status });
      return fallbackDefinition;
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const definition = data.choices?.[0]?.message?.content?.replace(/^["']|["']$/g, '').trim();
    return definition || fallbackDefinition;
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.warn(isTimeout ? '[OPENAI_TIMEOUT]' : '[OPENAI_FETCH_ERROR]', 'Definition fetch failed', { word });
    return fallbackDefinition;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function buildWorksheet(words: WorksheetWord[], openAiKey: string) {
  if (!openAiKey) {
    console.warn('[OPENAI_CONFIG_MISSING] OPENAI_API_KEY not configured; worksheet will use stored definitions only');
  }

  const questionSource = shuffle(words);

  const questions: WorksheetQuestion[] = await Promise.all(
    questionSource.map(async (item) => {
      const safeWord = item.word ?? '';
      const distractors = generatePhoneticMisspellings(safeWord);
      const options = shuffle([safeWord, ...distractors]).slice(0, 4);

      // Prefer stored definition from DB; only call AI when definition is absent
      const definition = item.definition?.trim()
        ? item.definition.trim()
        : await getDefinition(safeWord, openAiKey);

      return {
        word: safeWord,
        definition: definition || fallbackDefinition,
        options,
        answer: safeWord
      };
    })
  );

  // Build Activity 2 matching data:
  // words in original shuffled order (numbered), definitions shuffled independently (lettered)
  const wordsList = questions.map((q) => q.word);
  const shuffledDefs = shuffle(
    questions.map((q, i) => ({ letter: '', definition: q.definition, wordIndex: i }))
  ).map((entry, i) => ({
    ...entry,
    letter: String.fromCharCode(65 + i) // A, B, C, ...
  }));

  // Answer mapping: letter -> word
  const matchingAnswers: Record<string, string> = {};
  for (const entry of shuffledDefs) {
    matchingAnswers[entry.letter] = wordsList[entry.wordIndex];
  }

  const matching = {
    words: wordsList,
    definitions: shuffledDefs.map((e) => ({ letter: e.letter, definition: e.definition })),
    answers: matchingAnswers
  };

  return {
    generatedAt: new Date().toISOString(),
    questions,
    matching,
    activities: [
      {
        type: 'select-correct-spelling',
        title: 'Activity 1: Select Correct Spelling',
        content: questions
      },
      {
        type: 'match-definitions',
        title: 'Activity 2: Match Words to Definitions',
        content: matching
      }
    ]
  };
}
