import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase-server';
import type { MatchingData, WorksheetQuestion } from '@/lib/worksheet';

type WorksheetRecord = {
  questions: WorksheetQuestion[];
  matching: MatchingData;
  generated_at: string;
};

export async function GET(
  request: NextRequest,
  context: { params: { listId: string } }
) {
  const type = request.nextUrl.searchParams.get('type') === 'answer' ? 'answer' : 'worksheet';

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

    const { data: worksheetRowRaw, error: worksheetError } = await supabase
      .from('worksheets')
      .select('questions, matching, generated_at, created_at')
      .eq('list_id', listRow.id)
      .eq('teacher_id', user.id)
      .order('generated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (worksheetError) {
      console.error('Failed to load worksheet for PDF generation', {
        listId: listRow.id,
        teacherId: user.id,
        error: worksheetError.message
      });
      return NextResponse.json({ error: 'Failed to load worksheet.' }, { status: 500 });
    }

    const worksheet = worksheetRowRaw as WorksheetRecord | null;

    if (!worksheet) {
      console.warn('No stored worksheet found for PDF generation', {
        listId: listRow.id,
        teacherId: user.id
      });
      return NextResponse.json({ error: 'Worksheet not found. Please generate it first.' }, { status: 404 });
    }

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - 2 * margin;

    // Helper function to add text with automatic page breaks
    const addText = (text: string, fontSize: number, isBold: boolean = false) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 15;
      }
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont(undefined, 'bold');
      } else {
        doc.setFont(undefined, 'normal');
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * (fontSize / 2.8) + 2;
    };

    // Title
    addText(
      type === 'answer'
        ? `${listRow.name} - Answer Key`
        : `${listRow.name} - Student Worksheet`,
      16,
      true
    );
    addText(`Generated: ${new Date(worksheet.generated_at).toLocaleString()}`, 9);
    yPosition += 8;

    // Activity 1: Select Correct Spelling
    addText('Activity 1: Select Correct Spelling', 13, true);
    yPosition += 3;

    worksheet.questions.forEach((q: WorksheetQuestion, i: number) => {
      if (type === 'answer') {
        addText(`${i + 1}. Correct spelling: ${q.answer}`, 11, true);
        addText(`Definition: ${q.definition}`, 9);
      } else {
        addText(`${i + 1}. Select the correct spelling:`, 11, true);
        q.options.forEach((opt) => {
          addText(`  • ${opt}`, 10);
        });
        addText('Write your answer: ________________________', 10);
      }
      yPosition += 3;
    });

    yPosition += 8;

    // Activity 2: Match Words to Definitions
    addText('Activity 2: Match Words to Definitions', 13, true);
    yPosition += 3;

    addText('Words:', 11, true);
    worksheet.matching.words.forEach((word: string, i: number) => {
      addText(`${i + 1}. ${word}`, 10);
    });

    yPosition += 5;

    addText('Definitions:', 11, true);
    worksheet.matching.definitions.forEach((def: any) => {
      addText(`${def.letter}. ${def.definition}`, 10);
      if (type === 'answer') {
        addText(`Answer: ${worksheet.matching.answers[def.letter]}`, 10, true);
      } else {
        addText('Answer: ________________________', 10);
      }
      yPosition += 2;
    });

    // Export PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${listRow.name}-${type}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    console.error('PDF generation error:', {
      listId: context.params.listId,
      error: err instanceof Error ? err.message : String(err)
    });
    return NextResponse.json(
      { error: `PDF generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
