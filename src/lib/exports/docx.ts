import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

interface QuestionExportData {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

interface ExportOptions {
  chapterName: string;
  subject: string;
  language: string;
  totalQuestions: number;
  includeAnswers: boolean;
  includeExplanations: boolean;
}

export async function generateDocxBuffer(
  questions: QuestionExportData[],
  options: ExportOptions
): Promise<Buffer> {
  const children: any[] = [];

  // Header Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: 'Elite Academy',
          bold: true,
          size: 32, // 16pt
          color: '1E3A8A', // Dark Blue primary
          font: 'Calibri',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
      children: [
        new TextRun({
          text: 'AI-Generated MCQ Question Bank',
          italics: true,
          size: 20, // 10pt
          color: '4B5563', // Gray
          font: 'Calibri',
        }),
      ],
    })
  );

  // Metadata block
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Chapter Name: ', bold: true, font: 'Calibri' }),
        new TextRun({ text: options.chapterName, font: 'Calibri' }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Subject: ', bold: true, font: 'Calibri' }),
        new TextRun({ text: options.subject, font: 'Calibri' }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Language: ', bold: true, font: 'Calibri' }),
        new TextRun({ text: options.language, font: 'Calibri' }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 480 },
      children: [
        new TextRun({ text: 'Total Questions: ', bold: true, font: 'Calibri' }),
        new TextRun({ text: `${options.totalQuestions}`, font: 'Calibri' }),
      ],
    })
  );

  // Separator Line
  children.push(
    new Paragraph({
      spacing: { after: 480 },
      children: [
        new TextRun({
          text: '_________________________________________________________________________________',
          color: 'D1D5DB',
        }),
      ],
    })
  );

  // Questions List
  questions.forEach((q, index) => {
    // Question Text
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `${index + 1}.  ${q.question}`,
            bold: true,
            size: 24, // 12pt
            font: 'Calibri',
          }),
        ],
      })
    );

    // Options
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 720 }, // Indent options
        children: [
          new TextRun({ text: 'A. ', bold: true, font: 'Calibri' }),
          new TextRun({ text: q.optionA, font: 'Calibri' }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 720 },
        children: [
          new TextRun({ text: 'B. ', bold: true, font: 'Calibri' }),
          new TextRun({ text: q.optionB, font: 'Calibri' }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { after: 60 },
        indent: { left: 720 },
        children: [
          new TextRun({ text: 'C. ', bold: true, font: 'Calibri' }),
          new TextRun({ text: q.optionC, font: 'Calibri' }),
        ],
      })
    );

    children.push(
      new Paragraph({
        spacing: { after: 180 },
        indent: { left: 720 },
        children: [
          new TextRun({ text: 'D. ', bold: true, font: 'Calibri' }),
          new TextRun({ text: q.optionD, font: 'Calibri' }),
        ],
      })
    );

    // Conditionally include answer
    if (options.includeAnswers) {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: 'Answer: ', bold: true, color: '10B981', font: 'Calibri' }),
            new TextRun({ text: q.correctAnswer, bold: true, font: 'Calibri' }),
          ],
        })
      );
    }

    // Conditionally include explanation
    if (options.includeExplanations) {
      children.push(
        new Paragraph({
          spacing: { after: 240 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: 'Explanation: ', bold: true, italics: true, color: '6B7280', font: 'Calibri' }),
            new TextRun({ text: q.explanation, italics: true, font: 'Calibri' }),
          ],
        })
      );
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  // Pack document into buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}
