# Spaced Spelling V3

Teacher-facing spaced spelling management application built with Next.js App Router, Supabase, and OpenAI.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in values.
3. Apply SQL in `supabase/migrations/001_initial_schema.sql` to your Supabase project.
4. Start development server:
   ```bash
   npm run dev
   ```

## Core behavior

- Spelling words are immutable after creation.
- Teaching week is immutable after list creation (name remains editable).
- Reviews are explicitly generated and stored at list creation.
- Review generation stops when `scheduled_week > 40`.
- Worksheet and answer-key PDFs are generated on demand.
