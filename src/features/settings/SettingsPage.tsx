/* Settings page: Bonsai minimalist layout for profile, integrations, notifications, and data */

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAccountSettings } from './hooks/useAccountSettings'
import { useNotificationSettings } from './hooks/useNotificationSettings'
import { useTaskImportExport } from './hooks/useTaskImportExport'
import { requestNotificationPermission, registerServiceWorker } from '../../lib/notifications/pushClient'
import { bulkInsertJournalEntriesFromCsv, getAllJournalEntriesForExport } from '../../lib/supabase/reflections'
import { resetHabitsFreshStart } from '../../lib/supabase/habits'
import { saveDismissedHabitReminderKeys } from '../notifications/dismissedHabitNotifications'
import {
  downloadCsv,
  exportMorningBriefingEntriesToCsv,
  parseMorningBriefingCsvFile,
} from '../reflections/utils/morningBriefingCsv'
import { MaterialIcon } from './components'
import { ProfileSettingsSection } from './sections/ProfileSettingsSection'
import { IntegrationsSettingsSection } from './sections/IntegrationsSettingsSection'
import { BillingSettingsSection } from './sections/BillingSettingsSection'
import { BriefingSettingsSection } from './sections/BriefingSettingsSection'
import { NotificationsSettingsSection } from './sections/NotificationsSettingsSection'
import { DataManagementSettingsSection } from './sections/DataManagementSettingsSection'
import { DevSettingsSection } from './sections/DevSettingsSection'

/**
 * Settings page: account profile, integrations, notifications, and data tools.
 */
export function SettingsPage() {
  const { user, signOut } = useAuth()

  const {
    firstName,
    lastName,
    location,
    email,
    timeZone,
    saving,
    isProfileDirty,
    error,
    success,
    clearStatus,
    setField,
    saveProfile,
    saveEmail,
  } = useAccountSettings(user)

  const {
    loading: loadingNotifications,
    saving: savingNotifications,
    error: notificationError,
    types: notificationTypes,
    isEnabled: isNotificationEnabled,
    togglePreference,
  } = useNotificationSettings()

  const { exportJson: exportTasksJson, exportCsv: exportTasksCsv, parseMappingFile, importFromFile } =
    useTaskImportExport()

  const reflectionsFileInputRef = useRef<HTMLInputElement | null>(null)
  const [reflectionsImportLoading, setReflectionsImportLoading] = useState(false)
  const [reflectionsImportSummary, setReflectionsImportSummary] = useState<{
    totalRows: number
    validRows: number
    errorCount: number
    firstErrors: string[]
  } | null>(null)

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

  const [habitsResetLoading, setHabitsResetLoading] = useState(false)
  const [habitsResetMessage, setHabitsResetMessage] = useState<string | null>(null)

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  const disabled = !user

  /* Save profile + email from profile card */
  const handleSaveProfileSection = async () => {
    clearStatus()
    await saveProfile()
    const trimmed = email.trim()
    if (trimmed && trimmed !== (user?.email ?? '')) {
      await saveEmail()
    }
  }

  const handleSignOut = async () => {
    clearStatus()
    await signOut()
  }

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return
    }
    await registerServiceWorker()
    const next = await requestNotificationPermission()
    setNotificationPermission(next)
  }

  const handleExportReflectionsCsv = useCallback(async () => {
    try {
      clearStatus()
      const all = await getAllJournalEntriesForExport()
      const csvText = exportMorningBriefingEntriesToCsv(all)
      downloadCsv('reflections-journal-export.csv', csvText)
    } catch (err) {
      console.error('Error exporting reflections CSV:', err)
    }
  }, [clearStatus])

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
        if (errors.length > 0 || rows.length === 0) return
        await bulkInsertJournalEntriesFromCsv(
          rows.map((r) => ({
            title: r.title,
            responses: r.responses,
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

  const handleExportTasksJson = useCallback(async () => {
    try {
      clearStatus()
      await exportTasksJson()
    } catch (err) {
      console.error('Error exporting tasks JSON:', err)
    }
  }, [clearStatus, exportTasksJson])

  const handleExportTasksCsv = useCallback(async () => {
    try {
      clearStatus()
      await exportTasksCsv()
    } catch (err) {
      console.error('Error exporting tasks CSV:', err)
    }
  }, [clearStatus, exportTasksCsv])

  const handleLoadTasksMappingFile = useCallback(
    async (file: File) => {
      setTasksMappingError(null)
      const { mapping, error: mapErr } = await parseMappingFile(file)
      if (mapErr) {
        setTasksMapping(null)
        setTasksMappingError(mapErr)
        return
      }
      setTasksMapping(mapping)
      setTasksMappingError(null)
    },
    [parseMappingFile],
  )

  const handleImportTasksFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setTasksImportLoading(true)
        setTasksImportSummary(null)
        const res = await importFromFile(file, tasksMapping as never)
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

  const handleResetHabitsFreshStart = useCallback(async () => {
    const confirmed = window.confirm(
      'Reset all habits to a fresh start? This clears habit log history and reminder notifications, then reschedules from today. Habit names and settings are kept.',
    )
    if (!confirmed) return

    try {
      clearStatus()
      setHabitsResetLoading(true)
      setHabitsResetMessage(null)
      const { habitsReset } = await resetHabitsFreshStart()
      saveDismissedHabitReminderKeys(new Set())
      setHabitsResetMessage(
        `Reset ${habitsReset} habit${habitsReset === 1 ? '' : 's'}. History and reminders cleared; schedules start from today.`,
      )
    } catch (err) {
      console.error('Error resetting habits:', err)
      setHabitsResetMessage(
        err instanceof Error ? err.message : 'Could not reset habits. Try again after refreshing.',
      )
    } finally {
      setHabitsResetLoading(false)
    }
  }, [clearStatus])

  return (
    <div className="mx-auto min-h-full w-full max-w-[800px]">
      {/* Page header */}
      <header className="mb-12">
        <h1 className="text-page-title mb-2 font-semibold tracking-[-0.02em] text-on-surface">Settings</h1>
        <p className="text-body font-normal text-on-surface-variant">
          Manage your personal preferences and digital environment.
        </p>
      </header>

      {/* Global status messages */}
      {(error || success) && (
        <div
          className="mb-8 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3"
          role="status"
        >
          {error ? <p className="text-secondary text-error">{error}</p> : null}
          {success ? <p className="text-secondary text-primary">{success}</p> : null}
        </div>
      )}

      <div className="space-y-16">
        <ProfileSettingsSection
          firstName={firstName}
          lastName={lastName}
          email={email}
          timeZone={timeZone}
          location={location}
          saving={saving}
          hasUnsavedChanges={isProfileDirty}
          disabled={disabled}
          onFieldChange={setField}
          onSave={() => void handleSaveProfileSection()}
        />

        <IntegrationsSettingsSection />

        <BillingSettingsSection />

        <BriefingSettingsSection />

        <NotificationsSettingsSection
          loading={loadingNotifications}
          saving={savingNotifications}
          error={notificationError}
          types={notificationTypes}
          notificationPermission={notificationPermission}
          isEnabled={isNotificationEnabled}
          onToggle={togglePreference}
          onEnableBrowserNotifications={() => void handleEnableBrowserNotifications()}
          disabled={disabled}
        />

        <DataManagementSettingsSection
          tasksFileInputRef={tasksFileInputRef}
          tasksMappingFileInputRef={tasksMappingFileInputRef}
          reflectionsFileInputRef={reflectionsFileInputRef}
          tasksImportLoading={tasksImportLoading}
          reflectionsImportLoading={reflectionsImportLoading}
          habitsResetLoading={habitsResetLoading}
          habitsResetMessage={habitsResetMessage}
          tasksMappingError={tasksMappingError}
          tasksMappingLoaded={Boolean(tasksMapping)}
          tasksImportSummary={
            tasksImportSummary
              ? {
                  totalRows: tasksImportSummary.totalRows,
                  errorCount: tasksImportSummary.errorCount,
                  firstErrors: tasksImportSummary.firstErrors,
                  detailLine: `Rows: ${tasksImportSummary.totalRows} • Tasks: ${tasksImportSummary.createdTasks} • Tags: ${tasksImportSummary.createdTags}${tasksImportSummary.errorCount > 0 ? ` • Errors: ${tasksImportSummary.errorCount}` : ''}`,
                }
              : null
          }
          reflectionsImportSummary={
            reflectionsImportSummary
              ? {
                  totalRows: reflectionsImportSummary.totalRows,
                  errorCount: reflectionsImportSummary.errorCount,
                  firstErrors: reflectionsImportSummary.firstErrors,
                  detailLine: `Rows: ${reflectionsImportSummary.totalRows} • Valid: ${reflectionsImportSummary.validRows}${reflectionsImportSummary.errorCount > 0 ? ` • Errors: ${reflectionsImportSummary.errorCount}` : ''}`,
                }
              : null
          }
          onExportTasksJson={() => void handleExportTasksJson()}
          onExportTasksCsv={() => void handleExportTasksCsv()}
          onExportReflectionsCsv={() => void handleExportReflectionsCsv()}
          onTasksFileChange={(f) => void handleImportTasksFile(f)}
          onTasksMappingFileChange={(f) => void handleLoadTasksMappingFile(f)}
          onReflectionsFileChange={(f) => void handleImportReflectionsCsvFile(f)}
          onResetHabitsFreshStart={() => void handleResetHabitsFreshStart()}
        />

        <DevSettingsSection />

        {/* Sign out */}
        <section className="pb-8">
          <div className="flex items-center justify-between rounded-xl border border-outline-variant/10 bg-surface-container-low/50 p-8">
            <div className="flex items-center gap-3">
              <MaterialIcon name="logout" className="text-on-surface-variant" />
              <p className="text-body font-medium text-on-surface-variant">Ready to step away?</p>
            </div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={disabled}
              className="rounded-lg border border-secondary px-8 py-2 text-sm font-semibold text-secondary shadow-sm transition-colors hover:bg-secondary-container/20 disabled:opacity-50"
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>

    </div>
  )
}
