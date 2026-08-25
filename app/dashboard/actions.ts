'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerActionSupabaseClient } from '@/lib/supabase-server';
import { generateDefinition } from '@/lib/definitions';
import { generateReviewWeeks } from '@/lib/schedule';
import type { ScheduleType } from '@/types/database';

const classInputSchema = z.object({
  name: z.string().min(1).max(120),
  scheduleType: z.enum(['fixed', 'expanding'])
});

const listSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().min(1).max(120),
  teachingWeek: z.coerce.number().int().min(1).max(40),
  wordsText: z.string().min(1)
});

function parseWords(wordsText: string): string[] {
  const words = wordsText
    .split(/[\n,]/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) {
    throw new Error('Please provide at least one word.');
  }

  if (words.length > 20) {
    throw new Error('A spelling list may contain a maximum of 20 words.');
  }

  return words;
}

export async function createClassAction(formData: FormData) {
  const parsed = classInputSchema.safeParse({
    name: formData.get('name'),
    scheduleType: formData.get('scheduleType')
  });

  if (!parsed.success) {
    throw new Error('Invalid class data.');
  }

  const supabase = createServerActionSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('classes').insert({
    teacher_id: user.id,
    name: parsed.data.name,
    schedule_type: parsed.data.scheduleType
  });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function renameClassAction(formData: FormData) {
  const classId = String(formData.get('classId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!classId || !name) throw new Error('Class name is required.');

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase.from('classes').update({ name }).eq('id', classId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteClassAction(formData: FormData) {
  const classId = String(formData.get('classId') ?? '');
  if (!classId) throw new Error('Class id is required.');

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function createSpellingListAction(formData: FormData) {
  const parsed = listSchema.safeParse({
    classId: formData.get('classId'),
    name: formData.get('name'),
    teachingWeek: formData.get('teachingWeek'),
    wordsText: formData.get('wordsText')
  });

  if (!parsed.success) {
    throw new Error('Invalid list data.');
  }

  const words = parseWords(parsed.data.wordsText);
  const supabase = createServerActionSupabaseClient();

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select('id, schedule_type')
    .eq('id', parsed.data.classId)
    .single();

  if (classError || !classRow) {
    throw new Error(classError?.message ?? 'Class not found.');
  }

  const { data: listRow, error: listError } = await supabase
    .from('spelling_lists')
    .insert({
      class_id: parsed.data.classId,
      name: parsed.data.name,
      teaching_week: parsed.data.teachingWeek
    })
    .select('id')
    .single();

  if (listError || !listRow) {
    throw new Error(listError?.message ?? 'Failed creating spelling list.');
  }

  const definitions = await Promise.all(words.map((word) => generateDefinition(word)));

  const wordRows = words.map((word, index) => ({
    spelling_list_id: listRow.id,
    word,
    definition: definitions[index]
  }));

  const { error: wordError } = await supabase.from('spelling_words').insert(wordRows);
  if (wordError) {
    throw new Error(wordError.message);
  }

  const reviewWeeks = generateReviewWeeks(parsed.data.teachingWeek, classRow.schedule_type as ScheduleType);
  const reviews = reviewWeeks.map((week, index) => ({
    spelling_list_id: listRow.id,
    class_id: parsed.data.classId,
    review_number: index + 1,
    scheduled_week: week,
    status: 'pending' as const
  }));

  if (reviews.length > 0) {
    const { error: reviewError } = await supabase.from('reviews').insert(reviews);
    if (reviewError) {
      throw new Error(reviewError.message);
    }
  }

  revalidatePath('/dashboard');
}

export async function renameSpellingListAction(formData: FormData) {
  const listId = String(formData.get('listId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!listId || !name) throw new Error('List name is required.');

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase.from('spelling_lists').update({ name }).eq('id', listId);

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function deleteSpellingListAction(formData: FormData) {
  const listId = String(formData.get('listId') ?? '');
  if (!listId) throw new Error('List id is required.');

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase.from('spelling_lists').delete().eq('id', listId);
  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function markReviewCompleteAction(formData: FormData) {
  const reviewId = String(formData.get('reviewId') ?? '');
  if (!reviewId) throw new Error('Review id is required.');

  const supabase = createServerActionSupabaseClient();
  const { error } = await supabase
    .from('reviews')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard');
}

export async function logoutAction() {
  const supabase = createServerActionSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath('/');
}
