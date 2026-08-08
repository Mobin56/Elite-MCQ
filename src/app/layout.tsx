import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Elite Academy | AI-Powered Smart MCQ Generator',
  description: 'Upload your chapter PDF or DOCX and instantly generate high-quality, exam-standard multiple choice questions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-[#090d16] via-[#020617] to-[#0d071a] text-gray-100 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
