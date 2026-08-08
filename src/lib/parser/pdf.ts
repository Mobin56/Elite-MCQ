import pdf from 'pdf-parse';

interface ParsedPDF {
  text: string;
  pages: number;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text || '',
      pages: data.numpages || 1,
    };
  } catch (error: any) {
    console.error('PDF parsing failed:', error);
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
}
