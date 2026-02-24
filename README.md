# GrantsHub

AI-powered grant management platform built with Next.js 16, Supabase, and TailwindCSS.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
The `.env.local` file is already configured with your Supabase credentials.

Add your OpenAI API key for AI features:
```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Run database migration
Go to your [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor → paste and run `supabase/migrations/001_initial.sql`.

### 4. Start dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **Grant Listing** — Add, edit, delete, filter, sort, paginate grants
- **Grant CRM** — Kanban-style pipeline (Researching → Pipeline → Active → Submitted → Won/Lost)
- **Grant Builder** — AI-powered grant application writer with configurable sections
- **Grant Crawler** — AI search to discover new grant opportunities
- **Grant Profile** — Organisation profile for AI matching and ranking
- **Company Info** — Company details used across all AI features
- **CSV Export** — Export filtered grants to CSV
- **Bulk Actions** — Select multiple grants for bulk CRM moves or deletion

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Styling**: TailwindCSS v4
- **AI**: OpenAI GPT-4o
- **Icons**: Lucide React
