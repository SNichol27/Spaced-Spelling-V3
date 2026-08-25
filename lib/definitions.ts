import OpenAI from 'openai';
import { env } from '@/lib/env';

const openai = env.openAiApiKey ? new OpenAI({ apiKey: env.openAiApiKey }) : null;

export async function generateDefinition(word: string): Promise<string> {
  if (!openai) {
    return `Definition for ${word}: explain this word in student-friendly language.`;
  }

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: `Provide one concise, student-friendly dictionary definition for the spelling word "${word}". Return only the definition sentence.`,
    max_output_tokens: 100
  });

  return response.output_text.trim() || `Definition for ${word}.`;
}

function mutateWord(word: string, index: number): string {
  if (word.length < 4) {
    return `${word}${index}`;
  }

  if (index % 3 === 0) {
    return `${word.slice(0, -1)}${word.slice(-1)}${word.slice(-1)}`;
  }
  if (index % 3 === 1) {
    return `${word[0]}${word.slice(2)}${word[1]}`;
  }
  return `${word.slice(0, 2)}e${word.slice(3)}`;
}

export async function generateDistractors(word: string): Promise<string[]> {
  if (!openai) {
    return [0, 1, 2].map((index) => mutateWord(word, index));
  }

  const response = await openai.responses.create({
    model: 'gpt-5-mini',
    input: `Generate exactly 3 plausible misspellings for the target word "${word}" suitable for elementary spelling practice. Return as a JSON array of strings and do not include the correct word.`,
    max_output_tokens: 150
  });

  const text = response.output_text.trim();
  try {
    const parsed = JSON.parse(text) as string[];
    const cleaned = parsed
      .map((item) => item.trim())
      .filter((item) => item && item.toLowerCase() !== word.toLowerCase())
      .slice(0, 3);

    if (cleaned.length === 3) {
      return cleaned;
    }
  } catch {
    // Fall through to heuristic.
  }

  return [0, 1, 2].map((index) => mutateWord(word, index));
}
