import { generateDistractors } from '@/lib/definitions';
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

export async function buildWorksheet(words: WorksheetWord[]) {
  const questionSource = shuffle(words);

  const questions: WorksheetQuestion[] = [];
  for (const item of questionSource) {
    const distractors = await generateDistractors(item.word);
    const options = shuffle([item.word, ...distractors]);
    questions.push({
      word: item.word,
      definition: item.definition,
      options,
      answer: item.word
    });
  }

  const definitions = shuffle(words).map((item) => ({
    word: item.word,
    definition: item.definition
  }));

  return {
    generatedAt: new Date().toISOString(),
    questions,
    definitions
  };
}
