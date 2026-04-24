/* Settings page: Account settings form for profile, auth, and location */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAccountSettings } from './hooks/useAccountSettings'
import { useGoogleCalendarConnection } from './hooks/useGoogleCalendarConnection'
import { useNotificationSettings } from './hooks/useNotificationSettings'
import { useTaskImportExport } from './hooks/useTaskImportExport'
import { requestNotificationPermission, registerServiceWorker } from '../../lib/notifications/pushClient'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Checkbox } from '../../components/Checkbox'
import { Select } from '../../components/Select'
import { PROFILE_TIME_ZONE_OPTIONS } from '../../lib/timezone'
import { bulkInsertMorningBriefingEntries, getAllMorningBriefingEntries } from '../../lib/supabase/reflections'
import {
  downloadCsv,
  exportMorningBriefingEntriesToCsv,
  parseMorningBriefingCsvFile,
} from '../reflections/utils/morningBriefingCsv'

/**
 * Settings page component
 * Displays account information, allows editing of profile details, email, password, and location, and supports logout.
 */
export function SettingsPage() {
  /* Auth context: access current user and sign-out action */
  const { user, signOut } = useAuth()
  /* Account settings hook: manage form state and update actions */
  const {
    firstName,
    lastName,
    location,
    email,
    timeZone,
    saving,
    locating,
    error,
    success,
    clearStatus,
    setField,
    autofillLocation,
    saveProfile,
    saveEmail,
    savePassword,
  } = useAccountSettings(user)

  /* Google Calendar OAuth: connect/disconnect status and actions */
  const {
    loading: googleCalendarLoading,
    connected: googleCalendarConnected,
    message: googleCalendarMessage,
    startConnect: startGoogleCalendarConnect,
    disconnect: disconnectGoogleCalendar,
  } = useGoogleCalendarConnection()

  /* Notification settings hook: manage per-type/channel notification preferences */
  const {
    loading: loadingNotifications,
    saving: savingNotifications,
    error: notificationError,
    types: notificationTypes,
    channels: notificationChannels,
    isEnabled: isNotificationEnabled,
    togglePreference,
  } = useNotificationSettings()

  /* Local password field state: keep separate from main hook state */
  const [password, setPassword] = useState('')

  /* Task import/export hook: parse and write tasks/subtasks using canonical templates */
  const { exportJson: exportTasksJson, exportCsv: exportTasksCsv, parseMappingFile, importFromFile } =
    useTaskImportExport()

  /* Reflections import/export: file picker ref and UI state for parsing + insert progress */
  const reflectionsFileInputRef = useRef<HTMLInputElement | null>(null)
  const [reflectionsImportLoading, setReflectionsImportLoading] = useState(false)
  const [reflectionsImportSummary, setReflectionsImportSummary] = useState<{
    totalRows: number
    validRows: number
    errorCount: number
    firstErrors: string[]
  } | null>(null)

  /* Tasks import/export: file picker refs and UI state for mapping + import summary */
  const tasksFileInputRef = useRef<HTMLInputElement | null>(null)
  const tasksMappingFileInputRef = useRef<HTMLInputElement | null>(null)
  const [tasksMapping, setTasksMapping] = useState<unknown | null>(null)
  const [tasksMappingError, setTasksMappingError] = useState<string | null>(null)
  const [tasksImportLoading, setTasksImportLoading] = useState(false)
  const [tasksImportSummary, setTasksImportSummary] = useState<{
    totalRows: number
    createdTasks: number
    createdChecklists: number
    createdChecklistItems: number
    createdDependencies: number
    createdTags: number
    errorCount: number
    firstErrors: string[]
  } | null>(null)

  /* Browser notification permission: show a clear CTA when permission isn't granted yet */
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  /* Derived full name for display-only summary */
  const displayName = useMemo(() => {
    const parts = [firstName, lastName].filter(Boolean)
    return parts.join(' ') || 'No name set'
  }, [firstName, lastName])

  /* Handler: wrapper to call saveProfile and clear previous messages if needed */
  const handleSaveProfile = async () => {
    clearStatus()
    await saveProfile()
  }

  /* Handler: attempt to auto-fill location from current device position */
  const handleAutofillLocation = async () => {
    clearStatus()
    await autofillLocation()
  }

  /* Handler: wrapper to call saveEmail and clear previous messages if needed */
  const handleSaveEmail = async () => {
    clearStatus()
    await saveEmail()
  }

  /* Handler: wrapper to call savePassword and clear previous messages if needed */
  const handleSavePassword = async () => {
    clearStatus()
    await savePassword(password)
    setPassword('')
  }

  /* Handler: sign the user out via auth context */
  const handleSignOut = async () => {
    clearStatus()
    await signOut()
  }

  /* Handler: request browser notification permission so local reminders can show */
  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }
    await registerServiceWorker()
    const next = await requestNotificationPermission()
    setNotificationPermission(next)
  }

  /* Handler: export all morning briefing reflections to CSV */
  const handleExportReflectionsCsv = useCallback(async () => {
    try {
      clearStatus()
      const all = await getAllMorningBriefingEntries()
      const csvText = exportMorningBriefingEntriesToCsv(all)
      downloadCsv('reflections-morning-briefing-export.csv', csvText)
    } catch (err) {
      console.error('Error exporting reflections CSV:', err)
    }
  }, [clearStatus])

  /* Handler: parse and import a reflections CSV */
  const handleImportReflectionsCsvFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setReflectionsImportLoading(true)
        setReflectionsImportSummary(null)

        const { rows, errors, totalRows } = await parseMorningBriefingCsvFile(file)
        const firstErrors = errors
          .slice(0, 5)
          .map((e) => (e.rowNumber ? `Row ${e.rowNumber}: ${e.message}` : e.message))
        setReflectionsImportSummary({
          totalRows,
          validRows: rows.length,
          errorCount: errors.length,
          firstErrors,
        })

        if (errors.length > 0) return
        if (rows.length === 0) return

        await bulkInsertMorningBriefingEntries(
          rows.map((r) => ({
            title: r.title,
            responses: r.responses as Record<string, unknown>,
            created_at: r.created_at,
          })),
        )
      } catch (err) {
        console.error('Error importing reflections CSV:', err)
      } finally {
        setReflectionsImportLoading(false)
      }
    },
    [clearStatus],
  )

  /* Handler: export tasks as full-fidelity JSON (includes subtasks, checklists, tags, dependencies, attachments) */
  const handleExportTasksJson = useCallback(async () => {
    try {
      clearStatus()
      await exportTasksJson()
    } catch (err) {
      console.error('Error exporting tasks JSON:', err)
    }
  }, [clearStatus, exportTasksJson])

  /* Handler: export tasks as basic CSV (flat rows, nested structures stored as JSON in cells) */
  const handleExportTasksCsv = useCallback(async () => {
    try {
      clearStatus()
      await exportTasksCsv()
    } catch (err) {
      console.error('Error exporting tasks CSV:', err)
    }
  }, [clearStatus, exportTasksCsv])

  /* Handler: load optional mapping file used to map foreign schema → Bonsai canonical fields */
  const handleLoadTasksMappingFile = useCallback(
    async (file: File) => {
      setTasksMappingError(null)
      const { mapping, error } = await parseMappingFile(file)
      if (error) {
        setTasksMapping(null)
        setTasksMappingError(error)
        return
      }
      setTasksMapping(mapping)
      setTasksMappingError(null)
    },
    [parseMappingFile],
  )

  /* Handler: parse and import tasks from CSV or JSON, optionally applying the mapping file */
  const handleImportTasksFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setTasksImportLoading(true)
        setTasksImportSummary(null)
        const res = await importFromFile(file, tasksMapping as any)

        const errors = (res.summary.errors ?? []).filter(Boolean)
        setTasksImportSummary({
          totalRows: res.summary.totalRows,
          createdTasks: res.summary.createdTasks,
          createdChecklists: res.summary.createdChecklists,
          createdChecklistItems: res.summary.createdChecklistItems,
          createdDependencies: res.summary.createdDependencies,
          createdTags: res.summary.createdTags,
          errorCount: errors.length,
          firstErrors: errors.slice(0, 5),
        })
      } catch (err) {
        console.error('Error importing tasks file:', err)
        setTasksImportSummary({
          totalRows: 0,
          createdTasks: 0,
          createdChecklists: 0,
          createdChecklistItems: 0,
          createdDependencies: 0,
          createdTags: 0,
          errorCount: 1,
          firstErrors: [err instanceof Error ? err.message : 'Unknown error importing tasks.'],
        })
      } finally {
        setTasksImportLoading(false)
      }
    },
    [clearStatus, importFromFile, tasksMapping],
  )

  return (
    <div className="min-h-full">
      {/* Section header: Display section name */}
      <h1 className="text-page-title font-bold text-bonsai-brown-700 mb-6">Settings</h1>

      {/* Layout container: stack on mobile, two-column on larger screens */}
      <div className="w-full h-full min-h-[60vh] grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-8">
        {/* Left column: editable account fields */}
        <div className="space-y-6">
          {/* Reflections import/export section: manage CSV import/export for morning briefings */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Reflections import / export</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Import and export your morning briefing reflections as CSV.
            </p>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <a
                className="text-secondary text-bonsai-sage-700 hover:underline"
                href="/templates/reflections-morning-briefing-template.csv"
                download
              >
                Download template
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleExportReflectionsCsv()}>
                Export CSV
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => reflectionsFileInputRef.current?.click()}
                disabled={reflectionsImportLoading}
              >
                {reflectionsImportLoading ? 'Importing…' : 'Import CSV'}
              </Button>
              <input
                ref={reflectionsFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (f) void handleImportReflectionsCsvFile(f)
                }}
              />
            </div>

            {reflectionsImportSummary && (
              <div className="mt-3 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2">
                <p className="text-secondary text-bonsai-slate-700">
                  Rows: {reflectionsImportSummary.totalRows} • Valid: {reflectionsImportSummary.validRows}
                  {reflectionsImportSummary.errorCount > 0
                    ? ` • Errors: ${reflectionsImportSummary.errorCount}`
                    : ''}
                </p>
                {reflectionsImportSummary.firstErrors.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-secondary text-red-700">
                    {reflectionsImportSummary.firstErrors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Tasks import/export section: manage JSON/CSV import/export for tasks and subtasks */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Tasks import / export</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Import and export tasks and subtasks. JSON is full-fidelity (tags, checklists, dependencies, attachments). CSV is a flat format with optional JSON-in-cells columns.
            </p>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-4">
                <a
                  className="text-secondary text-bonsai-sage-700 hover:underline"
                  href="/templates/tasks-import-template.json"
                  download
                >
                  Download JSON template
                </a>
                <a
                  className="text-secondary text-bonsai-sage-700 hover:underline"
                  href="/templates/tasks-import-template.csv"
                  download
                >
                  Download CSV template
                </a>
                <a
                  className="text-secondary text-bonsai-sage-700 hover:underline"
                  href="/templates/tasks-import-mapping-template.json"
                  download
                >
                  Download mapping template
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleExportTasksJson()}>
                Export JSON (full)
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleExportTasksCsv()}>
                Export CSV (basic)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => tasksMappingFileInputRef.current?.click()}
                disabled={tasksImportLoading}
              >
                Load mapping (optional)
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => tasksFileInputRef.current?.click()}
                disabled={tasksImportLoading}
              >
                {tasksImportLoading ? 'Importing…' : 'Import file'}
              </Button>

              <input
                ref={tasksMappingFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (f) void handleLoadTasksMappingFile(f)
                }}
              />
              <input
                ref={tasksFileInputRef}
                type="file"
                accept=".csv,text/csv,.json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (f) void handleImportTasksFile(f)
                }}
              />
            </div>

            {tasksMappingError && (
              <p className="text-secondary text-red-600 mt-3">{tasksMappingError}</p>
            )}
            {tasksMapping && !tasksMappingError && (
              <p className="text-secondary text-bonsai-slate-600 mt-3">
                Mapping loaded. Imports will apply your field/header mapping.
              </p>
            )}

            {tasksImportSummary && (
              <div className="mt-3 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 px-3 py-2">
                <p className="text-secondary text-bonsai-slate-700">
                  Rows: {tasksImportSummary.totalRows} • Tasks: {tasksImportSummary.createdTasks} • Tags created:{' '}
                  {tasksImportSummary.createdTags} • Checklists: {tasksImportSummary.createdChecklists} • Items:{' '}
                  {tasksImportSummary.createdChecklistItems} • Dependencies: {tasksImportSummary.createdDependencies}
                  {tasksImportSummary.errorCount > 0 ? ` • Errors: ${tasksImportSummary.errorCount}` : ''}
                </p>
                {tasksImportSummary.firstErrors.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-secondary text-red-700">
                    {tasksImportSummary.firstErrors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Profile section: first name, last name, and location */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Profile</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Update your basic profile details so Bonsai can personalize your experience.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="First name"
                value={firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                disabled={!user || saving}
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                disabled={!user || saving}
              />
            </div>
            <div className="mb-4">
              <Input
                label="Location"
                value={location}
                onChange={(e) => setField('location', e.target.value)}
                placeholder="City, Country"
                autoComplete="address-level2"
                disabled={!user || saving || locating}
              />
              <div className="mt-2 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleAutofillLocation}
                  disabled={!user || saving || locating}
                >
                  {locating ? 'Finding location…' : 'Auto-fill from current location'}
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <Select
                label="Time zone"
                value={timeZone}
                onChange={(e) => setField('timeZone', e.target.value)}
                options={PROFILE_TIME_ZONE_OPTIONS}
                disabled={!user || saving}
              />
              <p className="text-secondary text-bonsai-slate-500 mt-2">
                Used for &quot;Today&quot; / &quot;Tomorrow&quot;, due labels, and reminders. Use
                device timezone unless your clock or region is incorrect.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveProfile}
                disabled={!user || saving || locating}
              >
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </div>
          </section>

          {/* Calendar section: optional shareable calendar links for agenda view */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Calendar</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Connect your calendar to surface today&apos;s agenda in your morning briefing.
            </p>
            {/* Calendar connection: Google OAuth flow for agenda access */}
            <div className="mb-6 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-body font-semibold text-bonsai-brown-700">Google Calendar</p>
                  <p className="text-secondary text-bonsai-slate-600 mt-1">
                    Status:{' '}
                    <span className="font-medium">
                      {googleCalendarConnected ? 'Connected' : 'Not connected'}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  {googleCalendarConnected ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void disconnectGoogleCalendar()}
                      disabled={!user || googleCalendarLoading}
                    >
                      {googleCalendarLoading ? 'Disconnecting…' : 'Disconnect'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => void startGoogleCalendarConnect()}
                      disabled={!user || googleCalendarLoading}
                    >
                      {googleCalendarLoading ? 'Connecting…' : 'Connect Google Calendar'}
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-secondary text-bonsai-slate-500 mt-3">
                Bonsai will only read your calendar to show today&apos;s agenda in your morning
                briefing. It will never modify your calendars.
              </p>
              {googleCalendarMessage && (
                <p className="text-secondary text-bonsai-slate-600 mt-2">{googleCalendarMessage}</p>
              )}
            </div>
          </section>

          {/* Notifications section: configure mobile PWA push preferences for different notification types */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Notifications</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Enable mobile push notifications for overdue tasks and reminders when using the Bonsai
              PWA from your Home Screen.
            </p>
            <div className="mb-4 rounded-lg border border-bonsai-slate-200 bg-bonsai-slate-50 p-3">
              <p className="text-secondary text-bonsai-slate-700">
                Browser notifications: <span className="font-medium">{notificationPermission}</span>
              </p>
              {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleEnableBrowserNotifications}
                    disabled={!user}
                  >
                    Enable browser notifications
                  </Button>
                </div>
              )}
              {notificationPermission === 'unsupported' && (
                <p className="text-secondary text-bonsai-slate-600 mt-2">
                  Notifications are not supported in this browser/environment.
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-secondary text-bonsai-slate-600 text-left py-2 pr-4">
                      Notification type
                    </th>
                    {notificationChannels.map((channel) => (
                      <th
                        key={channel}
                        className="text-secondary text-bonsai-slate-600 text-left py-2 px-2"
                      >
                        {channel === 'push_mobile' && 'Mobile push'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notificationTypes.map((type) => (
                    <tr key={type} className="border-t border-bonsai-slate-100">
                      <td className="text-body text-bonsai-slate-800 py-2 pr-4">
                        {type === 'task_due_soon' && 'Tasks due in 1 hour'}
                        {type === 'task_overdue' && 'Overdue tasks'}
                        {type === 'habit_reminder_due' && 'Habit reminders due'}
                        {type === 'morning_briefing_incomplete_noon' && 'Morning briefing incomplete by 12pm'}
                        {type === 'reminder_due' && 'Reminders due'}
                      </td>
                      {notificationChannels.map((channel) => (
                        <td key={channel} className="py-2 px-2">
                          <Checkbox
                            size="sm"
                            checked={isNotificationEnabled(type, channel)}
                            onChange={() => void togglePreference(type, channel)}
                            disabled={loadingNotifications || savingNotifications || !user}
                            aria-label={`${type} via ${channel}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {notificationError && (
              <p className="text-secondary text-red-600 mt-3">{notificationError}</p>
            )}
          </section>

          {/* Email section: change sign-in email address */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Email address</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Change the email you use to sign in. You may need to confirm this change from your
              inbox.
            </p>
            <div className="mb-4">
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={!user || saving}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveEmail}
                disabled={!user || saving}
              >
                {saving ? 'Saving…' : 'Update email'}
              </Button>
            </div>
          </section>

          {/* Password section: update password securely */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Password</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              Set a new password for your account. Make sure it is strong and unique.
            </p>
            <div className="mb-4">
              <Input
                type="password"
                label="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a new password"
                autoComplete="new-password"
                disabled={!user || saving}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleSavePassword}
                disabled={!user || saving || !password.trim()}
              >
                {saving ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </section>
        </div>

        {/* Right column: account summary and logout */}
        <aside className="space-y-4">
          {/* Account summary card: show key details for quick reference */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Account</h2>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Name</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">{displayName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Email</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">
                  {email || 'No email set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-secondary text-bonsai-slate-600">Location</dt>
                <dd className="text-body text-bonsai-slate-800 text-right">
                  {location || 'No location set'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Status messages: show latest error or success feedback */}
          {(error || success) && (
            <section className="rounded-xl p-4 bg-bonsai-slate-50 border border-bonsai-slate-200">
              {error && (
                <p className="text-secondary text-red-600 mb-2">
                  {error}
                </p>
              )}
              {success && (
                <p className="text-secondary text-bonsai-sage-700">
                  {success}
                </p>
              )}
            </section>
          )}

          {/* Logout card: sign out of the current account */}
          <section className="border border-bonsai-slate-200 rounded-xl p-4 md:p-6 bg-white">
            <h2 className="text-body font-semibold text-bonsai-brown-700 mb-4">Sign out</h2>
            <p className="text-secondary text-bonsai-slate-600 mb-4">
              You&apos;ll be signed out of Bonsai on this device. You can sign back in at any time.
            </p>
            <Button
              type="button"
              variant="danger"
              onClick={handleSignOut}
              disabled={!user}
            >
              Log out
            </Button>
          </section>
        </aside>
      </div>
    </div>
  )
}

