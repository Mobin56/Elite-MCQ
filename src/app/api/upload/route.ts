import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { parsePDF } from '@/lib/parser/pdf';
import { parseDocx } from '@/lib/parser/docx';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const fileName = file.name;
    const fileSize = file.size;
    const fileType = fileName.split('.').pop()?.toUpperCase() || '';

    if (!['PDF', 'DOCX', 'DOC'].includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a PDF or DOCX/DOC file.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';
    let pageCount = 1;

    if (fileType === 'PDF') {
      const parsed = await parsePDF(buffer);
      extractedText = parsed.text;
      pageCount = parsed.pages;
    } else if (fileType === 'DOCX' || fileType === 'DOC') {
      const parsed = await parseDocx(buffer);
      extractedText = parsed.text;
      const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
      pageCount = Math.max(1, Math.ceil(wordCount / 400));
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({
        error: 'Unable to read this document. The file might be empty, password-protected, or a scanned image lacking readable text.',
        status: 'FAILED'
      }, { status: 400 });
    }

    const docRecord = await db.document.create({
      data: {
        userId: user.userId,
        fileName,
        filePath: `/uploads/${fileName}`,
        fileType,
        extractedText: extractedText,
        status: 'PARSED',
      },
    });

    return NextResponse.json({
      message: 'File uploaded and parsed successfully.',
      documentId: docRecord.id,
      fileName: docRecord.fileName,
      fileSize: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
      pages: pageCount,
      status: 'PARSED',
    });
  } catch (error: any) {
    console.error('File parsing error:', error);
    return NextResponse.json({ error: error.message || 'File processing failed.' }, { status: 500 });
  }
}
