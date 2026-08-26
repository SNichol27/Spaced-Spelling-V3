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

  const { data: listRowRaw, error: listError } = await supabase
    .from('spelling_lists')
    .select('id, name, class_id')
    .eq('id', context.params.listId)
    .single();

  const listRow = listRowRaw as { id: string; name: string; class_id: string } | null;

  if (listError || !listRow) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const { data: classRow, error: classError } = await supabase
    .from('classes')
    .select('id')
    .eq('id', listRow.class_id)
    .eq('teacher_id', user.id)
    .single();

  if (classError || !classRow) {
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

  try {
    const worksheet = await buildWorksheet(words ?? [], process.env.OPENAI_API_KEY ?? '');
    const { error: saveError } = await supabase.from('worksheets').insert({
      list_id: listRow.id,
      teacher_id: user.id,
      questions: worksheet.questions,
      matching: worksheet.matching,
      generated_at: worksheet.generatedAt
    });

    if (saveError) {
      console.error('Failed to save generated worksheet', {
        listId: listRow.id,
        teacherId: user.id,
        error: saveError.message
      });
      return NextResponse.json({ error: 'Failed to save worksheet.' }, { status: 500 });
    }

    return NextResponse.json({
      listName: listRow.name,
      ...worksheet
    });
  } catch (error) {
    console.error('Worksheet generation failed', {
      listId: listRow.id,
      teacherId: user.id,
      error
    });
    return NextResponse.json({ error: 'Failed to generate worksheet.' }, { status: 500 });
  }
}
