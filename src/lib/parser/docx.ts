import mammoth from 'mammoth';

interface ParsedDocx {
  text: string;
  html: string;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocx> {
  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });
    return {
      text: rawResult.value || '',
      html: htmlResult.value || '',
    };
  } catch (error: any) {
    console.error('DOCX parsing failed:', error);
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
}
