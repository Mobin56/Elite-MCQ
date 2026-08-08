import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  try {
    const { fileName, fileType, extractedText, fileSize, pages } = await req.json();

    if (!fileName || !fileType || !extractedText) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (extractedText.trim().length < 50) {
      return NextResponse.json({
        error: 'Unable to read this document. The extracted text is empty or too short.',
        status: 'FAILED'
      }, { status: 400 });
    }

    const docRecord = await db.document.create({
      data: {
        userId: user.userId,
        fileName,
        filePath: `/uploads/${fileName}`,
        fileType: fileType.toUpperCase(),
        extractedText: extractedText,
        status: 'PARSED',
      },
    });

    return NextResponse.json({
      message: 'File uploaded and parsed successfully.',
      documentId: docRecord.id,
      fileName: docRecord.fileName,
      fileSize: fileSize || 'Unknown',
      pages: pages || 1,
      status: 'PARSED',
    });
  } catch (error: any) {
    console.error('File registration error:', error);
    return NextResponse.json({ error: error.message || 'File processing failed.' }, { status: 500 });
  }
}
