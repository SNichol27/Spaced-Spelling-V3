import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase-server';
import { buildWorksheet } from '@/lib/worksheet';
import { AnswerKeyDocument, WorksheetDocument } from '@/components/pdf-documents';

export async function GET(
  request: NextRequest,
  context: { params: { listId: string } }
) {
  const type = request.nextUrl.searchParams.get('type') === 'answer' ? 'answer' : 'worksheet';
  const supabase = createRouteHandlerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: listRow, error: listError } = await supabase
    .from('spelling_lists')
    .select('id, name, classes!inner(teacher_id)')
    .eq('id', context.params.listId)
    .eq('classes.teacher_id', user.id)
    .single();

  if (listError || !listRow) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 });
  }

  const { data: words, error: wordsError } = await supabase
    .from('spelling_words')
    .select('word, definition')
    .eq('spelling_list_id', listRow.id);

  if (wordsError) {
    return NextResponse.json({ error: wordsError.message }, { status: 400 });
  }

  const worksheet = await buildWorksheet(words ?? []);

  const document =
    type === 'answer'
      ? React.createElement(AnswerKeyDocument, {
          listName: listRow.name,
          generatedAt: worksheet.generatedAt,
          questions: worksheet.questions
        })
      : React.createElement(WorksheetDocument, {
          listName: listRow.name,
          generatedAt: worksheet.generatedAt,
          questions: worksheet.questions,
          definitions: worksheet.definitions
        });

  const pdfStream = await renderToStream(document);

  return new NextResponse(pdfStream as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${listRow.name}-${type}.pdf"`
    }
  });
}
