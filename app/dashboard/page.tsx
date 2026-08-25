import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  createClassAction,
  createSpellingListAction,
  deleteClassAction,
  deleteSpellingListAction,
  logoutAction,
  markReviewCompleteAction,
  renameClassAction,
  renameSpellingListAction
} from './actions';
import { WorksheetGenerator } from '@/components/worksheet-generator';
import { ConfirmSubmitButton } from '@/components/confirm-submit-button';
import { DueReviewItem } from '@/components/due-review-item';

type DashboardProps = {
  searchParams?: {
    classId?: string;
    week?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const weekFromQuery = Number(searchParams?.week ?? '1');
  const currentWeek = Number.isInteger(weekFromQuery) && weekFromQuery >= 1 && weekFromQuery <= 40 ? weekFromQuery : 1;

  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name, schedule_type, created_at')
    .order('created_at', { ascending: true });

  if (classError) {
    throw new Error(classError.message);
  }

  const selectedClassId = searchParams?.classId ?? classes?.[0]?.id;

  const [listsResult, reviewsResult] = selectedClassId
    ? await Promise.all([
        supabase
          .from('spelling_lists')
          .select('id, name, teaching_week, created_at')
          .eq('class_id', selectedClassId)
          .order('created_at', { ascending: false }),
        supabase
          .from('reviews')
          .select('id, spelling_list_id, review_number, scheduled_week, status, completed_at')
          .eq('class_id', selectedClassId)
          .order('scheduled_week', { ascending: true })
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (listsResult.error) throw new Error(listsResult.error.message);
  if (reviewsResult.error) throw new Error(reviewsResult.error.message);

  const listNameById = new Map((listsResult.data ?? []).map((list) => [list.id, list.name]));

  const dueReviews = (reviewsResult.data ?? []).filter(
    (review) => review.status === 'pending' && review.scheduled_week <= currentWeek
  );
  const upcomingReviews = (reviewsResult.data ?? []).filter(
    (review) => review.status === 'pending' && review.scheduled_week > currentWeek
  );
  const completedReviews = (reviewsResult.data ?? []).filter((review) => review.status === 'completed');
  void upcomingReviews;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <header className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Spaced Spelling Dashboard</h1>
          <p className="text-sm text-slate-600">Welcome, {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={logoutAction}>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Logout
            </button>
          </form>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-6">
          <section className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900">Classes</h2>
            <ul className="mt-3 space-y-2">
              {(classes ?? []).map((klass) => (
                <li key={klass.id} className="rounded-lg border border-slate-200 p-3">
                  <a
                    href={`/dashboard?classId=${klass.id}&week=${currentWeek}`}
                    className={`block text-sm font-medium ${klass.id === selectedClassId ? 'text-indigo-700' : 'text-slate-700'}`}
                  >
                    {klass.name}
                  </a>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{klass.schedule_type} schedule</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-slate-500">Manage</summary>
                    <div className="mt-2 space-y-2">
                      <form action={renameClassAction} className="space-y-2">
                        <input type="hidden" name="classId" value={klass.id} />
                        <input
                          name="name"
                          defaultValue={klass.name}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Save</button>
                      </form>
                      <form action={deleteClassAction}>
                        <input type="hidden" name="classId" value={klass.id} />
                        <ConfirmSubmitButton
                          message="Delete class and all associated lists/reviews?"
                          className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Delete Class
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
            <form action={createClassAction} className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <input
                name="name"
                placeholder="Class name"
                required
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <select name="scheduleType" required className="w-full rounded border border-slate-300 px-3 py-2 text-sm">
                <option value="expanding">Expanding schedule</option>
                <option value="fixed">Fixed schedule</option>
              </select>
              <button className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                Add Class
              </button>
            </form>
          </section>

          {selectedClassId ? (
            <section className="card p-4">
              <h2 className="text-lg font-semibold text-slate-900">Create Spelling List</h2>
              <form action={createSpellingListAction} className="mt-3 space-y-2">
                <input type="hidden" name="classId" value={selectedClassId} />
                <input
                  name="name"
                  placeholder="List name"
                  required
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  name="teachingWeek"
                  type="number"
                  min={1}
                  max={40}
                  required
                  placeholder="Teaching week"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  name="wordsText"
                  required
                  rows={6}
                  placeholder="Enter up to 20 words (newline or comma separated)"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <button className="w-full rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                  Save List + Generate Reviews
                </button>
              </form>
            </section>
          ) : null}
        </aside>

        <section className="space-y-6">
          <section className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Review Queue</h2>
              <div className="flex items-center gap-2">
                <form>
                  <input type="hidden" name="classId" value={selectedClassId ?? ''} />
                  <input type="hidden" name="week" value={Math.max(1, currentWeek - 1)} />
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100">Previous Week</button>
                </form>
                <p className="min-w-20 text-center text-sm font-medium text-slate-700">Week {currentWeek}</p>
                <form>
                  <input type="hidden" name="classId" value={selectedClassId ?? ''} />
                  <input type="hidden" name="week" value={Math.min(40, currentWeek + 1)} />
                  <button className="rounded border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100">Next Week</button>
                </form>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Due</h3>
                <ul className="mt-2 space-y-2">
                  {dueReviews.length === 0 ? <li className="text-sm text-slate-500">None</li> : null}
                  {dueReviews.map((review) => (
                    <DueReviewItem
                      key={review.id}
                      reviewId={review.id}
                      spellingListId={review.spelling_list_id}
                      listName={listNameById.get(review.spelling_list_id) ?? 'Spelling List'}
                      reviewNumber={review.review_number}
                      scheduledWeek={review.scheduled_week}
                      action={markReviewCompleteAction}
                    />
                  ))}
                </ul>
              </div>
              <ReviewColumn title="Completed" reviews={completedReviews} listNameById={listNameById} />
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-lg font-semibold text-slate-900">Spelling Lists</h2>
            <ul className="mt-3 space-y-3">
              {(listsResult.data ?? []).map((list) => (
                <li key={list.id} data-list-id={list.id} className="rounded-lg border border-slate-200 p-3 transition-shadow duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{list.name}</p>
                      <p className="text-xs text-slate-500">Teaching Week {list.teaching_week}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <form action={renameSpellingListAction} className="space-y-2">
                      <input type="hidden" name="listId" value={list.id} />
                      <input
                        name="name"
                        defaultValue={list.name}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                      <button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100">Rename</button>
                    </form>
                    <div className="space-y-2">
                      <form action={deleteSpellingListAction}>
                        <input type="hidden" name="listId" value={list.id} />
                        <ConfirmSubmitButton
                          message="Delete list, words, and all generated reviews?"
                          className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        >
                          Delete List
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </div>
                  <div className="mt-3">
                    <WorksheetGenerator listId={list.id} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </section>
    </main>
  );
}

type ReviewItem = {
  id: string;
  spelling_list_id: string;
  review_number: number;
  scheduled_week: number;
  status: 'pending' | 'completed';
  completed_at: string | null;
};

function ReviewColumn({
  title,
  reviews,
  listNameById,
  action,
  buttonLabel
}: {
  title: string;
  reviews: ReviewItem[];
  listNameById: Map<string, string>;
  action?: (formData: FormData) => Promise<void>;
  buttonLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{title}</h3>
      <ul className="mt-2 space-y-2">
        {reviews.length === 0 ? <li className="text-sm text-slate-500">None</li> : null}
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg bg-white p-3 text-sm shadow-sm">
            <p className="font-medium text-slate-900">
              {listNameById.get(review.spelling_list_id) ?? 'Spelling List'} – Review #{review.review_number}
            </p>
            <p className="text-slate-600">Week {review.scheduled_week}</p>
            {review.status === 'completed' && review.completed_at ? (
              <p className="text-xs text-emerald-700">Completed {new Date(review.completed_at).toLocaleDateString()}</p>
            ) : null}
            {action && buttonLabel ? (
              <form action={action} className="mt-2">
                <input type="hidden" name="reviewId" value={review.id} />
                <button className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50">
                  {buttonLabel}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
