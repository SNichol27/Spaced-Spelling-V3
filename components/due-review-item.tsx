'use client';

import { useState } from 'react';

interface DueReviewItemProps {
  reviewId: string;
  spellingListId: string;
  listName: string;
  reviewNumber: number;
  scheduledWeek: number;
  action: (formData: FormData) => Promise<void>;
}

export function DueReviewItem({
  reviewId,
  spellingListId,
  listName,
  reviewNumber,
  scheduledWeek,
  action
}: DueReviewItemProps) {
  const [message, setMessage] = useState<string | null>(null);

  function scrollToList() {
    const target = document.querySelector<HTMLElement>(`[data-list-id="${spellingListId}"]`);
    if (!target) {
      setMessage('List not visible in current filter.');
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    target.classList.add('ring-2', 'ring-indigo-400', 'ring-offset-2');
    setTimeout(() => {
      target.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2');
    }, 1500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollToList();
    }
  }

  return (
    <li className="rounded-lg bg-white p-3 text-sm shadow-sm">
      <button
        type="button"
        onClick={scrollToList}
        onKeyDown={handleKeyDown}
        className="w-full text-left font-medium text-indigo-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {listName} – Review #{reviewNumber}
      </button>
      <p className="text-slate-600">Week {scheduledWeek}</p>
      {message ? <p className="mt-1 text-xs text-amber-700">{message}</p> : null}
      <form action={action} className="mt-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
          Mark Complete
        </button>
      </form>
    </li>
  );
}
