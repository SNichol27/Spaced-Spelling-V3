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

export async function getDefinition(word: string, openAiKey: string): Promise<string> {
  if (!openAiKey) {
    return fallbackDefinition;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ['Bearer', openAiKey].join(' ')
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
      return fallbackDefinition;
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const definition = data.choices?.[0]?.message?.content?.replace(/^["']|["']$/g, '').trim();
    return definition || fallbackDefinition;
  } catch {
    return fallbackDefinition;
  }
}

export async function buildWorksheet(words: WorksheetWord[], openAiKey: string) {
  const questionSource = shuffle(words);

  const questions: WorksheetQuestion[] = [];
  for (const item of questionSource) {
    const distractors = generatePhoneticMisspellings(item.word);
    const options = shuffle([item.word, ...distractors]).slice(0, 4);
    const generatedDefinition = await getDefinition(item.word, openAiKey);

    questions.push({
      word: item.word,
      definition: generatedDefinition || item.definition || fallbackDefinition,
      options,
      answer: item.word
    });
  }

  const definitions = shuffle(questions).map((item) => ({
    word: item.word,
    definition: item.definition
  }));

  return {
    generatedAt: new Date().toISOString(),
    questions,
    definitions,
    activities: [
      {
        type: 'multiple-choice',
        title: 'Activity 1: Multiple Choice Spelling',
        content: questions
      },
      {
        type: 'match-definitions',
        title: 'Activity 2: Match Words to Definitions',
        content: {
          words: definitions.map((entry) => entry.word),
          definitions: definitions.map((entry) => entry.definition)
        }
      }
    ]
  };
}
