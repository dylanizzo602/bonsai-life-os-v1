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
   - Add your Supabase project URL and anon key:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
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

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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
