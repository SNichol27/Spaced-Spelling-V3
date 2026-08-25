import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase-server';
import { buildWorksheet } from '@/lib/worksheet';
import { AnswerKeyDocument, WorksheetDocument } from '@/components/pdf-documents';

export const runtime = 'nodejs';
// Allow up to 60 seconds for worksheet generation + PDF rendering on Vercel
export const maxDuration = 60;

type PdfType = 'answer' | 'worksheet';

function resolvePdfType(rawType: string | null): PdfType | null {
  if (!rawType || rawType === 'worksheet') return 'worksheet';
  if (rawType === 'answer') return 'answer';
  return null;
}

function buildSafePdfFilename(listName: string, type: PdfType) {
  const normalized = listName
    .trim()
    .replace(/[\u0000-\u001f\u007f"*/:<>?\\|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .slice(0, 80);
  const baseName = (normalized || 'worksheet').replace(/[^\x20-\x7e]/g, '').trim() || 'worksheet';
  return `${baseName}-${type}.pdf`;
}

export async function GET(
  request: NextRequest,
  context: { params: { listId: string } }
) {
  const rawType = request.nextUrl.searchParams.get('type');
  const type = resolvePdfType(rawType);

  if (!type) {
    return NextResponse.json(
      { error: 'Invalid export type. Use "worksheet" or "answer".' },
      { status: 400 }
    );
  }

  try {
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

    if (!words || words.length === 0) {
      return NextResponse.json({ error: 'No words found for this list' }, { status: 400 });
    }

    const worksheet = await buildWorksheet(words ?? [], process.env.OPENAI_API_KEY ?? '');

    const document =
      type === 'answer'
        ? React.createElement(AnswerKeyDocument, {
            listName: listRow.name,
            generatedAt: worksheet.generatedAt,
            questions: worksheet.questions,
            matching: worksheet.matching
          })
        : React.createElement(WorksheetDocument, {
            listName: listRow.name,
            generatedAt: worksheet.generatedAt,
            questions: worksheet.questions,
            matching: worksheet.matching
          });

    const pdfBuffer = await renderToBuffer(document as React.ReactElement);
    const fileName = buildSafePdfFilename(listRow.name, type);
    const encodedFileName = encodeURIComponent(fileName);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (err) {
    console.error('[pdf/route] PDF generation failed', {
      listId: context.params.listId,
      type,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      nodeVersion: process.version
    });
    return NextResponse.json(
      { error: 'Failed to generate PDF. Please try again.' },
      { status: 500 }
    );
  }
}
