'use client';

import { useState } from 'react';

type WorksheetQuestion = {
  word: string;
  options: string[];
  answer: string;
  definition: string;
};

type WorksheetPayload = {
  listName: string;
  generatedAt: string;
  questions: WorksheetQuestion[];
  definitions: { word: string; definition: string }[];
};

export function WorksheetGenerator({ listId }: { listId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorksheetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <a
            href={`/api/worksheets/${listId}/pdf?type=worksheet`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50"
          >
            Export Worksheet PDF
          </a>
          <a
            href={`/api/worksheets/${listId}/pdf?type=answer`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-emerald-300 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
          >
            Export Answer Key PDF
          </a>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      {data ? (
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <p className="text-xs text-slate-500">Generated: {new Date(data.generatedAt).toLocaleString()}</p>
          <div>
            <h4 className="font-semibold text-slate-900">Activity 1: Spelling Questions</h4>
            <ol className="mt-2 space-y-3">
              {data.questions.map((question, index) => (
                <li key={`${question.word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 font-medium">{index + 1}. Select the correct spelling:</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {question.options.map((option) => (
                      <span key={`${question.word}-${option}`} className="rounded border border-slate-200 px-2 py-1">
                        {option}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Activity 2: Definitions</h4>
            <ul className="mt-2 space-y-2">
              {data.definitions.map((entry, index) => (
                <li key={`${entry.word}-${index}`} className="rounded-lg border border-slate-200 p-3">
                  <p className="font-medium">{entry.word}</p>
                  <p className="text-slate-600">{entry.definition}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
