import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase-server';
import { buildWorksheet } from '@/lib/worksheet';

export async function GET(
  request: NextRequest,
  context: { params: { listId: string } }
) {
  const supabase = createRouteHandlerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: listRow, error: listError } = await supabase
    .from('spelling_lists')
    .select('id, name, class_id, classes!inner(teacher_id)')
    .eq('id', context.params.listId)
    .eq('classes.teacher_id', user.id)
    .single();

  if (listError || !listRow) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const { data: words, error: wordsError } = await supabase
    .from('spelling_words')
    .select('word, definition')
    .eq('spelling_list_id', listRow.id)
    .order('created_at', { ascending: true });

  if (wordsError) {
    return NextResponse.json({ error: wordsError.message }, { status: 400 });
  }

  const worksheet = await buildWorksheet(words ?? []);

  return NextResponse.json({
    listName: listRow.name,
    ...worksheet
  });
}
