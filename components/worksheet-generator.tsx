'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadElementAsPdf } from '@/lib/pdf-download';

type WorksheetQuestion = {
  word: string;
  options: string[];
  answer: string;
  definition: string;
};

type LegacyDefinitionEntry = {
  word: string;
  definition: string;
};

type MatchingDefinitionEntry = {
  letter: string;
  definition: string;
};

type MatchingData = {
  words?: string[];
  definitions?: MatchingDefinitionEntry[];
  answers?: Record<string, string>;
};

type WorksheetPayload = {
  listName: string;
  generatedAt: string;
  questions?: WorksheetQuestion[];
  definitions?: LegacyDefinitionEntry[];
  matching?: MatchingData;
};

export function WorksheetGenerator({ listId }: { listId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorksheetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutoDownloadGeneratedAt = useRef<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/worksheets/${listId}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to generate worksheet.');
      }
      const payload = (await response.json()) as WorksheetPayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate worksheet.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!data || lastAutoDownloadGeneratedAt.current === data.generatedAt) return;
    lastAutoDownloadGeneratedAt.current = data.generatedAt;
    const payload = data;

    async function autoDownloadPdfs() {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

      const worksheetElement = document.getElementById('worksheet-content');
      const answerKeyElement = document.getElementById('answer-key-content');
      if (!worksheetElement || !answerKeyElement) return;

      const listName = payload.listName ?? 'worksheet';
      try {
        await downloadElementAsPdf(worksheetElement, `${listName}-worksheet.pdf`);
      } catch (err) {
        console.error('Failed to auto-download worksheet PDF', err);
      }

      try {
        await downloadElementAsPdf(answerKeyElement, `${listName}-answer-key.pdf`);
      } catch (err) {
        console.error('Failed to auto-download answer key PDF', err);
      }
    }

    void autoDownloadPdfs();
  }, [data]);

  const questions = Array.isArray(data?.questions) ? data.questions : [];
  const matchingWords = Array.isArray(data?.matching?.words) ? data.matching.words : [];
  const matchingDefinitions = Array.isArray(data?.matching?.definitions) ? data.matching.definitions : [];
  const legacyDefinitions = Array.isArray(data?.definitions) ? data.definitions : [];
  const hasMatchingActivity = matchingWords.length > 0 || matchingDefinitions.length > 0;
  const hasLegacyDefinitions = legacyDefinitions.length > 0;

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">Worksheet Generator</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {loading ? 'Generating…' : 'Generate Worksheet'}
          </button>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        PDFs download automatically after you generate a worksheet.
      </p>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {data ? (
        <>
        <div id="worksheet-content" className="mt-4 space-y-4 text-sm text-slate-700">
          <p className="text-xs text-slate-500">Generated: {new Date(data.generatedAt).toLocaleString()}</p>
          <div>
            <h4 className="font-semibold text-slate-900">Activity 1: Spelling Questions</h4>
            {questions.length > 0 ? (
              <ol className="mt-2 space-y-3">
                {questions.map((question, index) => (
                  <li key={`${question.word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <p className="mb-2 font-medium">{index + 1}. Select the correct spelling:</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {(Array.isArray(question.options) ? question.options : []).map((option) => (
                        <span key={`${question.word}-${option}`} className="rounded border border-slate-200 px-2 py-1">
                          {option}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-slate-500">No spelling questions available.</p>
            )}
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Activity 2: Match Words to Definitions</h4>
            {hasMatchingActivity ? (
              <div className="mt-2 grid gap-4 lg:grid-cols-2">
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Words</h5>
                  {matchingWords.length > 0 ? (
                    <ol className="mt-2 space-y-2">
                      {matchingWords.map((word, index) => (
                        <li key={`${word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                          <span className="font-medium">{index + 1}.</span> {word}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-slate-500">No words available.</p>
                  )}
                </div>
                <div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Definitions</h5>
                  {matchingDefinitions.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {matchingDefinitions.map((entry, index) => (
                        <li key={`${entry.letter}-${index}`} className="rounded-lg border border-slate-200 p-3">
                          <p className="font-medium">{entry.letter}.</p>
                          <p className="text-slate-600">{entry.definition}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-slate-500">No definitions available.</p>
                  )}
                </div>
              </div>
            ) : hasLegacyDefinitions ? (
              <ul className="mt-2 space-y-2">
                {legacyDefinitions.map((entry, index) => (
                  <li key={`${entry.word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-medium">{entry.word}</p>
                    <p className="text-slate-600">{entry.definition}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-slate-500">No matching activity available.</p>
            )}
          </div>
        </div>
        <div id="answer-key-content" className="mt-4 space-y-4 text-sm text-slate-700">
          <p className="font-bold text-slate-900">Answer Key</p>
          <p className="text-xs text-slate-500">Generated: {new Date(data.generatedAt).toLocaleString()}</p>
          <div>
            <h4 className="font-semibold text-slate-900">Activity 1: Spelling Answers</h4>
            {questions.length > 0 ? (
              <ol className="mt-2 space-y-2">
                {questions.map((question, index) => (
                  <li key={`ans-${question.word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <span className="font-medium">{index + 1}.</span>{' '}
                    <span className="text-emerald-700 font-semibold">{question.answer}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-slate-500">No answers available.</p>
            )}
          </div>
          {hasMatchingActivity && data?.matching?.answers ? (
            <div>
              <h4 className="font-semibold text-slate-900">Activity 2: Matching Answers</h4>
              <ul className="mt-2 space-y-2">
                {matchingWords.map((word, index) => (
                  <li key={`match-ans-${word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <span className="font-medium">{index + 1}. {word}</span>{' '}
                    &rarr;{' '}
                    <span className="text-emerald-700">{data.matching?.answers?.[word] ?? ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        </>
      ) : null}
    </section>
  );
}
