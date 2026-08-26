import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase-server';
import type { MatchingData, WorksheetQuestion } from '@/lib/worksheet';

type WorksheetRecord = {
  questions: WorksheetQuestion[];
  matching: MatchingData;
  generated_at: string;
};

// Page constants (A4 in points)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addPageIfNeeded(
  doc: InstanceType<typeof PDFDocument>,
  neededHeight: number,
  y: number
): number {
  if (y + neededHeight > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function buildWorksheetPdf(
  doc: InstanceType<typeof PDFDocument>,
  listName: string,
  generatedAt: string,
  questions: WorksheetQuestion[],
  matching: MatchingData
) {
  let y = MARGIN;

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text(`${listName} - Student Worksheet`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 28;
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Generated: ${new Date(generatedAt).toLocaleString()}`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;
  doc.fillColor('#000000');

  // Activity 1
  doc.fontSize(13).font('Helvetica-Bold').text('Activity 1: Select Correct Spelling', MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    // Estimate height: question line + 4 options + answer line + spacing
    const estimatedHeight = 18 + q.options.length * 16 + 22 + 16;
    y = addPageIfNeeded(doc, estimatedHeight, y);

    doc.fontSize(11).font('Helvetica-Bold').text(`${i + 1}. Select the correct spelling:`, MARGIN, y, { width: CONTENT_WIDTH });
    y += 18;

    doc.font('Helvetica').fontSize(11);
    for (const option of q.options) {
      doc.text(`• ${option}`, MARGIN + 14, y, { width: CONTENT_WIDTH - 14 });
      y += 16;
    }

    doc.text('Correct Spelling: _________________', MARGIN + 14, y, { width: CONTENT_WIDTH - 14 });
    y += 22;

    // small gap between questions
    y += 8;
  }

  y += 8;

  // Activity 2
  const act2HeadingHeight = 20 + 18 + matching.words.length * 18 + 18;
  y = addPageIfNeeded(doc, act2HeadingHeight > 80 ? 80 : act2HeadingHeight, y);

  doc.fontSize(13).font('Helvetica-Bold').text('Activity 2: Match Words to Definitions', MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;

  doc.fontSize(11).font('Helvetica-Bold').text('Words', MARGIN, y);
  y += 18;
  doc.font('Helvetica').fontSize(11);
  for (let i = 0; i < matching.words.length; i++) {
    y = addPageIfNeeded(doc, 18, y);
    doc.text(`${i + 1}. ${matching.words[i]}`, MARGIN + 14, y, { width: CONTENT_WIDTH - 14 });
    y += 18;
  }

  y += 8;
  y = addPageIfNeeded(doc, 26, y);
  doc.fontSize(11).font('Helvetica-Bold').text('Definitions', MARGIN, y);
  y += 18;

  doc.font('Helvetica').fontSize(11);
  for (const entry of matching.definitions) {
    // Estimate height: definition text + word line + spacing
    const defHeight = 36 + 20 + 10;
    y = addPageIfNeeded(doc, defHeight, y);

    const defText = `${entry.letter}. ${entry.definition}`;
    doc.text(defText, MARGIN, y, { width: CONTENT_WIDTH });
    const defTextHeight = doc.heightOfString(defText, { width: CONTENT_WIDTH });
    y += defTextHeight + 6;

    doc.text('Word: _______', MARGIN + 14, y, { width: CONTENT_WIDTH - 14 });
    y += 20;

    y += 8;
  }
}

function buildAnswerKeyPdf(
  doc: InstanceType<typeof PDFDocument>,
  listName: string,
  generatedAt: string,
  questions: WorksheetQuestion[],
  matching: MatchingData
) {
  let y = MARGIN;

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text(`${listName} - Answer Key`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 28;
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(`Generated: ${new Date(generatedAt).toLocaleString()}`, MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;
  doc.fillColor('#000000');

  // Activity 1
  doc.fontSize(13).font('Helvetica-Bold').text('Activity 1: Select Correct Spelling', MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;

  doc.font('Helvetica').fontSize(11);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const estimatedHeight = 16 + 16;
    y = addPageIfNeeded(doc, estimatedHeight, y);

    doc.font('Helvetica').text(`${i + 1}. Correct spelling: `, MARGIN, y, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#065f46').text(q.answer, { width: CONTENT_WIDTH });
    doc.fillColor('#000000');
    y += 18;
  }

  y += 12;

  // Activity 2
  y = addPageIfNeeded(doc, 40, y);
  doc.fontSize(13).font('Helvetica-Bold').text('Activity 2: Match Words to Definitions', MARGIN, y, { width: CONTENT_WIDTH });
  y += 20;

  doc.font('Helvetica').fontSize(11);
  for (const entry of matching.definitions) {
    const defHeight = 36 + 20 + 8;
    y = addPageIfNeeded(doc, defHeight, y);

    const defText = `${entry.letter}. ${entry.definition}`;
    doc.text(defText, MARGIN, y, { width: CONTENT_WIDTH });
    const defTextHeight = doc.heightOfString(defText, { width: CONTENT_WIDTH });
    y += defTextHeight + 6;

    doc.font('Helvetica').text('Answer: ', MARGIN + 14, y, { continued: true });
    doc.font('Helvetica-Bold').fillColor('#065f46').text(matching.answers[entry.letter] ?? '', { width: CONTENT_WIDTH - 14 });
    doc.fillColor('#000000').font('Helvetica');
    y += 20;

    y += 6;
  }
}

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

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: MARGIN, autoFirstPage: true });
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', resolve);
      doc.on('error', reject);

      if (type === 'answer') {
        buildAnswerKeyPdf(doc, listRow.name, worksheet.generated_at, worksheet.questions, worksheet.matching);
      } else {
        buildWorksheetPdf(doc, listRow.name, worksheet.generated_at, worksheet.questions, worksheet.matching);
      }

      doc.end();
    });

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${listRow.name}-${type}.pdf"`
      }
    });
  } catch (err) {
    console.error('PDF generation error:', {
      listId: context.params.listId,
      error: err
    });
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
