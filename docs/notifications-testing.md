## Notifications testing guide

- **Goal**: Provide a repeatable way to seed data and verify that email and push notifications fire for overdue tasks, due reminders, and habit reminders while respecting user preferences.

### 1. Run migrations

- Apply the latest Supabase migrations so notification tables exist:
  - `user_notification_preferences`
  - `notification_devices`
  - `notifications`

### 2. Configure environment for the edge function

- Set the following environment variables for the `notifications` Edge Function:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Optional email provider:
    - `NOTIFICATIONS_EMAIL_API_URL`
    - `NOTIFICATIONS_EMAIL_API_KEY`
- If the email provider variables are omitted, the function will log intended emails instead of sending them.

### 3. Seed test data

- Create a test user and sign in via the app so they have:
  - At least one `tasks` row with:
    - `status` = `active` or `in_progress`
    - `due_date` set to a time in the past (for overdue)
  - At least one `reminders` row with:
    - `remind_at` set to a time in the past
    - `completed` = `false`
    - `deleted` = `false`
  - At least one `habits` row with:
    - `add_to_todos` = `true`
    - `reminder_time` set earlier in the current day
    - Linked `reminders` row created by the app (via `reminder_id`) whose `remind_at` is in the past

### 4. Verify user preferences defaults

- Open the Settings page in the app.
- In the **Notifications** section, confirm that:
  - All checkboxes for:
    - Overdue tasks – Email / Web push / Mobile push
    - Reminders due – Email / Web push / Mobile push
    - Habit reminders due – Email / Web push / Mobile push
  - Are checked by default (no explicit preference rows still allow notifications).

### 5. Invoke the edge function locally

- Run the `notifications` Edge Function using the Supabase CLI.
- Call it with the `?debug=true` query parameter to see a JSON summary:
  - `overdueTasks` > 0 when seeded tasks are overdue.
  - `dueReminders` > 0 for reminder test data.
  - `dueHabitReminders` > 0 when habit reminders are due.

### 6. Inspect notifications table

- Query the `notifications` table for the test user:
  - Confirm rows exist for:
    - `type` = `task_overdue`, `reminder_due`, `habit_reminder_due`
    - `channel` = `email` / `push_web` / `push_mobile` depending on preferences.
  - Confirm:
    - `status` = `sent` when the adapter ran successfully.
    - `status` = `error` and `error` message populated when the adapter failed.

### 7. Verify email and push behavior

- If an email provider is configured:
  - Check the test inbox for:
    - “Task overdue: …”
    - “Reminder due: …”
    - “Habit reminder: …”
- For push:
  - With a real provider integrated later, confirm that devices receive push notifications corresponding to rows inserted into `notifications`.

### 8. Test user preferences toggling

- In the app Settings:
  - Disable **Email** for “Overdue tasks”.
  - Recreate or adjust a task to be newly overdue.
  - Re-run the `notifications` Edge Function.
  - Confirm:
    - No new `notifications` rows appear with `type = task_overdue` and `channel = email`.
    - Other enabled channels still receive new rows.

