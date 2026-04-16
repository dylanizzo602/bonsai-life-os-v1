# Bonsai Life OS

A responsive productivity web app built around task management. Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Supabase.

## Features

- **Full Task Management**: Create, read, update, and delete tasks
- **Task Properties**: Title, description, due dates, priorities (low/medium/high), categories
- **Subtasks**: Break down tasks into smaller subtasks
- **Filtering & Search**: Filter by status, priority, category, due date, and search by title/description
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Completion Tracking**: Mark tasks and subtasks as complete with timestamps

## Tech Stack

- **React 19.2.0** - UI framework
- **TypeScript** - Type safety
- **Vite 7.2.4** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first styling
- **Supabase** - PostgreSQL database and backend services
- **ESLint** - Code linting

## Prerequisites

- **Node.js** (LTS recommended)
- **Supabase account** (for database) or **Supabase CLI** (for local development)

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Add your Supabase project URL and anon key (and optional web push key):
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_base64url
     ```

3. **Set up database** (if using Supabase):
   - Run the migration file in `supabase/migrations/20240101000000_create_tasks_tables.sql` in your Supabase SQL editor
   - Or use Supabase CLI: `supabase db push` (if using local Supabase)

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   - Navigate to `http://localhost:5173`

## PWA Push Notifications (Web Push)

This repo supports **PWA mobile push** via:

- **Client**: stores web push subscriptions in Supabase `notification_devices` when enabled in Settings.
- **Service worker**: `public/service-worker.js` displays push notifications.
- **Sender**: Vercel Serverless Function (`api/push/send`) delivers to stored subscriptions.
- **Scheduler/trigger**: `supabase/functions/notifications` calls a push sender URL when it finds due/overdue items.

### Configure (high level)

- **Generate VAPID keys** (run anywhere with Node):
  - `npx web-push generate-vapid-keys`
- **Set client env**:
  - `VITE_VAPID_PUBLIC_KEY` in `.env`
- **Deploy the push sender**:
  - Deploy this repo to Vercel; it will expose `POST /api/push/send`
- **Set Supabase Edge Function env** for `supabase/functions/notifications`:
  - `NOTIFICATIONS_PUSH_API_URL` (e.g. `https://your-vercel-app.vercel.app/api/push/send`)
  - `NOTIFICATIONS_PUSH_API_KEY` (must match Vercel env `NOTIFICATIONS_PUSH_API_KEY`)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Google Calendar (OAuth) for Morning Briefing

This repo supports connecting **Google Calendar** so the Morning Briefing can show **today’s events** without pasting an ICS link.

### What it does

- **Read-only**: Bonsai requests `calendar.readonly` scope and only reads events to render an agenda.
- **Server-side tokens**: Google refresh tokens are stored in Supabase (table `google_calendar_tokens`) and only used by Supabase Edge Functions.

### Setup steps

1. **Create a Google OAuth client** (Google Cloud Console)
   - Type: “Web application”
   - Add an **authorized redirect URI** pointing to your Supabase Edge Function callback:
     - `https://YOUR_PROJECT_REF.supabase.co/functions/v1/google-oauth-callback`

2. **Set Supabase Edge Function secrets**
   - In your Supabase project (Edge Functions → Secrets), set:
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GOOGLE_OAUTH_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REDIRECT_URL` (same value as your authorized redirect URI above)
     - `GOOGLE_OAUTH_STATE_SECRET` (random long string)
     - `APP_BASE_URL` (where users should be redirected after connecting, e.g. `http://localhost:5173` or your deployed URL)
   - Ensure your project also has:
     - `SUPABASE_SERVICE_ROLE_KEY` (needed by the edge functions to read/write token rows securely)

3. **Deploy the Edge Functions**
   - Functions added for Google Calendar:
     - `google-oauth-start`
     - `google-oauth-callback`
     - `google-calendar-events-today`
     - `google-calendar-disconnect`

4. **Connect from the app**
   - Open **Settings → Calendar** and click **Connect Google Calendar**
   - After granting access, return to Morning Briefing → “Today’s calendar”

## Project Structure

```
src/
├── app/              # App entry point and root component
├── components/       # Reusable UI components (Button, Input, Select, etc.)
├── features/         # Feature modules
│   ├── layout/       # Layout components
│   └── tasks/        # Task management feature
│       ├── hooks/    # Custom React hooks
│       └── types.ts  # TypeScript type definitions
└── lib/              # Shared utilities
    └── supabase/     # Supabase client and data access layer
```

## Database Schema

### Tasks Table
- `id` (UUID, primary key)
- `title` (text, required)
- `description` (text, optional)
- `due_date` (timestamptz, optional)
- `priority` (enum: low, medium, high)
- `category` (text, optional)
- `status` (enum: active, completed)
- `recurrence_pattern` (text, optional - for future recurring tasks)
- `completed_at` (timestamptz, optional)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Subtasks Table
- `id` (UUID, primary key)
- `task_id` (UUID, foreign key to tasks)
- `title` (text, required)
- `completed` (boolean)
- `created_at` (timestamptz)

## Architecture

- **Feature-based architecture**: Code organized by features for scalability
- **Separation of concerns**: UI components, data access, and business logic are separated
- **Type safety**: Full TypeScript coverage with strict mode enabled
- **Responsive design**: Mobile-first approach with Tailwind CSS breakpoints

## Notes

- This is a single-user app (no authentication layer)
- All tasks are stored in Supabase PostgreSQL database
- The app uses Supabase's real-time capabilities (can be extended for live updates)
