# Elite Academy — AI-Powered Smart MCQ Generator Portal

Elite Academy is a web-based educational portal that parses textbook chapters in PDF/DOCX formats, analyzes their educational content, and uses AI to generate high-quality, exam-standard multiple-choice questions (MCQs). It supports dynamic ratios of question types (numerical, equation, stimulus, critical, etc.) and exports them into styled Word documents (.docx).

## Features

- **Textbook Parsers**: Extract raw content from PDF and DOCX documents preserving structure and bold text references.
- **Smart Ratios**: Dynamically customize type distributions (numerical, equation, stimulus, critical, diagram) and difficulty (easy, medium, hard).
- **Subject-Aware Distribution**: Automatically redistribute diagram or equation ratios if the document does not contain enough diagrams or mathematical content, warning the user in a log.
- **Batch MCQ Generation**: Scalable background processing to generate up to 3000+ MCQs in sequential batches, preventing timeouts.
- **Validator AI Pipeline**: Generator LLM outputs questions which are checked by a Validator LLM for accuracy, valid distractor options, and correct answer flags.
- **Duplicate Detection**: Uses Jaccard word-overlap similarity to deduplicate redundant questions.
- **Interactive Preview & Editor**: Search, filter by difficulty/type, edit questions inline, regenerate individual questions, or delete them.
- **Word/DOCX Exporter**: Export as a beautifully formatted question bank with three layouts (Questions only, Questions + Answers, Questions + Answers + Explanations).
- **Admin Dashboard**: View platform-wide metrics (total users, generated MCQs, storage usage, estimated AI costs) and manage accounts/credit balances.

---

## Technical Stack

- **Framework**: Next.js 14 (App Router, React, Tailwind CSS)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT Cookie Session
- **AI Integrations**: Native fetch API wrapping Gemini and OpenAI models.

---

## Setup & Running

1. **Configure Environment Variables**
   Open the `.env` file and set your API keys:
   ```env
   AI_PROVIDER=gemini
   AI_MODEL=gemini-1.5-flash
   AI_API_KEY=your-gemini-api-key
   ```

2. **Initialize Database and Seed**
   Since the database is pre-configured with SQLite, run Prisma db push to sync schemas:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

3. **Run Development Server**
   Start the Next.js dev server:
   ```bash
   npm run dev
   ```
   The portal will run at `http://localhost:3000`.

---

## Seed Accounts for Testing

Use these accounts to instantly test out the platform without registering:

### 1. Regular User (Teacher/Student)
- **Email**: `user@eliteacademy.com`
- **Password**: `userpassword`
- **Credits**: 1,000 MCQ credits

### 2. Admin User
- **Email**: `admin@eliteacademy.com`
- **Password**: `adminpassword`
- **Credits**: 100,000 MCQ credits
