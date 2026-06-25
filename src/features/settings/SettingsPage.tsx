/* Settings page: Bonsai minimalist layout for profile, integrations, notifications, and data */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useAccountSettings } from './hooks/useAccountSettings'
import { useProfileAvatar } from './hooks/useProfileAvatar'
import { useNotificationSettings } from './hooks/useNotificationSettings'
import { useTaskImportExport } from './hooks/useTaskImportExport'
import { useReflectionImportExport } from './hooks/useReflectionImportExport'
import { useNoteImportExport } from './hooks/useNoteImportExport'
import { useImportRevert } from './hooks/useImportRevert'
import { requestNotificationPermission, registerServiceWorker } from '../../lib/notifications/pushClient'
import { resetHabitsFreshStart } from '../../lib/supabase/habits'
import { saveDismissedHabitReminderKeys } from '../notifications/dismissedHabitNotifications'
import type { ImportMode } from './types/importExport'
import { MaterialIcon } from './components'
import { ProfileSettingsSection } from './sections/ProfileSettingsSection'
import { IntegrationsSettingsSection } from './sections/IntegrationsSettingsSection'
import { BillingSettingsSection } from './sections/BillingSettingsSection'
import { BriefingSettingsSection } from './sections/BriefingSettingsSection'
import { HabitsSettingsSection } from './sections/HabitsSettingsSection'
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
    avatarUrl,
    uploading: avatarUploading,
    error: avatarError,
    uploadAvatar,
  } = useProfileAvatar(user)

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
  const { exportCsv: exportReflectionsCsv, importFromFile: importReflectionsFromFile } =
    useReflectionImportExport()
  const { exportCsv: exportNotesCsv, importFromFile: importNotesFromFile } = useNoteImportExport()
  const {
    batch: revertBatch,
    loading: revertLoading,
    reverting,
    error: revertError,
    refresh: refreshRevert,
    revert: revertLastImport,
  } = useImportRevert()

  const [importMode, setImportMode] = useState<ImportMode>('create')

  const reflectionsFileInputRef = useRef<HTMLInputElement | null>(null)
  const notesFileInputRef = useRef<HTMLInputElement | null>(null)
  const [reflectionsImportLoading, setReflectionsImportLoading] = useState(false)
  const [reflectionsImportSummary, setReflectionsImportSummary] = useState<{
    totalRows: number
    createdCount: number
    updatedCount: number
    errorCount: number
    firstErrors: string[]
  } | null>(null)

  const tasksFileInputRef = useRef<HTMLInputElement | null>(null)
  const tasksMappingFileInputRef = useRef<HTMLInputElement | null>(null)
  const [tasksMapping, setTasksMapping] = useState<unknown | null>(null)
  const [tasksMappingError, setTasksMappingError] = useState<string | null>(null)
  const [tasksImportLoading, setTasksImportLoading] = useState(false)
  const [notesImportLoading, setNotesImportLoading] = useState(false)
  const [notesImportSummary, setNotesImportSummary] = useState<{
    totalRows: number
    createdCount: number
    updatedCount: number
    errorCount: number
    firstErrors: string[]
  } | null>(null)
  const [tasksImportSummary, setTasksImportSummary] = useState<{
    totalRows: number
    createdTasks: number
    updatedTasks: number
    createdChecklists: number
    createdChecklistItems: number
    createdDependencies: number
    createdTags: number
    errorCount: number
    firstErrors: string[]
    warnings: string[]
  } | null>(null)

  const [habitsResetLoading, setHabitsResetLoading] = useState(false)
  const [habitsResetMessage, setHabitsResetMessage] = useState<string | null>(null)

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission
  })

  /* Google Calendar OAuth return: show banner after redirect from Google consent */
  const [googleCalendarOauthBanner, setGoogleCalendarOauthBanner] = useState<string | null>(null)
  const didHandleGoogleCalendarReturnRef = useRef(false)

  useEffect(() => {
    if (didHandleGoogleCalendarReturnRef.current) return
    const params = new URLSearchParams(window.location.search)
    const status = params.get('google_calendar')
    if (status !== 'connected' && status !== 'error') return

    didHandleGoogleCalendarReturnRef.current = true
    setGoogleCalendarOauthBanner(
      status === 'connected'
        ? 'Google Calendar connected successfully.'
        : 'Could not connect Google Calendar. Please try again.',
    )

    params.delete('google_calendar')
    const remaining = params.toString()
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (remaining ? `?${remaining}` : ''),
    )
  }, [])

  const disabled = !user

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

  const handleImportTasksFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setTasksImportLoading(true)
        setTasksImportSummary(null)
        const res = await importFromFile(file, {
          mapping: tasksMapping as never,
          mode: importMode,
        })
        const errors = [
          ...(res.summary.errors ?? []),
          ...(res.summary.warnings ?? []),
        ].filter(Boolean)
        setTasksImportSummary({
          totalRows: res.summary.totalRows,
          createdTasks: res.summary.createdTasks,
          updatedTasks: res.summary.updatedTasks,
          createdChecklists: res.summary.createdChecklists,
          createdChecklistItems: res.summary.createdChecklistItems,
          createdDependencies: res.summary.createdDependencies,
          createdTags: res.summary.createdTags,
          errorCount: errors.length,
          firstErrors: errors.slice(0, 5),
          warnings: res.summary.warnings,
        })
        await refreshRevert()
      } catch (err) {
        console.error('Error importing tasks file:', err)
        setTasksImportSummary({
          totalRows: 0,
          createdTasks: 0,
          updatedTasks: 0,
          createdChecklists: 0,
          createdChecklistItems: 0,
          createdDependencies: 0,
          createdTags: 0,
          errorCount: 1,
          firstErrors: [err instanceof Error ? err.message : 'Unknown error importing tasks.'],
          warnings: [],
        })
      } finally {
        setTasksImportLoading(false)
      }
    },
    [clearStatus, importFromFile, importMode, refreshRevert, tasksMapping],
  )

  const handleImportReflectionsCsvFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setReflectionsImportLoading(true)
        setReflectionsImportSummary(null)
        const summary = await importReflectionsFromFile(file, importMode)
        setReflectionsImportSummary({
          totalRows: summary.totalRows,
          createdCount: summary.createdCount,
          updatedCount: summary.updatedCount,
          errorCount: summary.errorCount,
          firstErrors: summary.errors.slice(0, 5),
        })
        await refreshRevert()
      } catch (err) {
        console.error('Error importing reflections CSV:', err)
        setReflectionsImportSummary({
          totalRows: 0,
          createdCount: 0,
          updatedCount: 0,
          errorCount: 1,
          firstErrors: [err instanceof Error ? err.message : 'Unknown error importing reflections.'],
        })
      } finally {
        setReflectionsImportLoading(false)
      }
    },
    [clearStatus, importMode, importReflectionsFromFile, refreshRevert],
  )

  const handleImportNotesFile = useCallback(
    async (file: File) => {
      try {
        clearStatus()
        setNotesImportLoading(true)
        setNotesImportSummary(null)
        const summary = await importNotesFromFile(file, importMode)
        setNotesImportSummary({
          totalRows: summary.totalRows,
          createdCount: summary.createdCount,
          updatedCount: summary.updatedCount,
          errorCount: summary.errorCount,
          firstErrors: summary.errors.slice(0, 5),
        })
        await refreshRevert()
      } catch (err) {
        console.error('Error importing notes CSV:', err)
        setNotesImportSummary({
          totalRows: 0,
          createdCount: 0,
          updatedCount: 0,
          errorCount: 1,
          firstErrors: [err instanceof Error ? err.message : 'Unknown error importing notes.'],
        })
      } finally {
        setNotesImportLoading(false)
      }
    },
    [clearStatus, importMode, importNotesFromFile, refreshRevert],
  )

  const handleRevertLastImport = useCallback(async () => {
    const confirmed = window.confirm(
      'This will undo your most recent import. You cannot undo this revert.',
    )
    if (!confirmed) return
    try {
      clearStatus()
      await revertLastImport()
    } catch (err) {
      console.error('Error reverting import:', err)
    }
  }, [clearStatus, revertLastImport])

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

  const handleExportReflectionsCsv = useCallback(async () => {
    try {
      clearStatus()
      await exportReflectionsCsv()
    } catch (err) {
      console.error('Error exporting reflections CSV:', err)
    }
  }, [clearStatus, exportReflectionsCsv])

  const handleExportNotesCsv = useCallback(async () => {
    try {
      clearStatus()
      await exportNotesCsv()
    } catch (err) {
      console.error('Error exporting notes CSV:', err)
    }
  }, [clearStatus, exportNotesCsv])

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
      <header className="mb-12">
        <h1 className="text-page-title mb-2 font-semibold tracking-[-0.02em] text-on-surface">Settings</h1>
        <p className="text-body font-normal text-on-surface-variant">
          Manage your personal preferences and digital environment.
        </p>
      </header>

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
          avatarUrl={avatarUrl}
          avatarUploading={avatarUploading}
          avatarError={avatarError}
          onUploadAvatar={uploadAvatar}
          onFieldChange={setField}
          onSave={() => void handleSaveProfileSection()}
        />

        <IntegrationsSettingsSection
          oauthBannerMessage={googleCalendarOauthBanner}
          onOAuthBannerDismiss={() => setGoogleCalendarOauthBanner(null)}
        />
        <BillingSettingsSection />
        <BriefingSettingsSection />
        <HabitsSettingsSection />

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
          notesFileInputRef={notesFileInputRef}
          importMode={importMode}
          onImportModeChange={setImportMode}
          tasksImportLoading={tasksImportLoading}
          reflectionsImportLoading={reflectionsImportLoading}
          notesImportLoading={notesImportLoading}
          habitsResetLoading={habitsResetLoading}
          habitsResetMessage={habitsResetMessage}
          tasksMappingError={tasksMappingError}
          tasksMappingLoaded={Boolean(tasksMapping)}
          revertBatch={revertBatch}
          revertLoading={revertLoading}
          reverting={reverting}
          revertError={revertError}
          onRevertLastImport={() => void handleRevertLastImport()}
          tasksImportSummary={
            tasksImportSummary
              ? {
                  totalRows: tasksImportSummary.totalRows,
                  errorCount: tasksImportSummary.errorCount,
                  firstErrors: tasksImportSummary.firstErrors,
                  detailLine: `Rows: ${tasksImportSummary.totalRows} • Created: ${tasksImportSummary.createdTasks} • Updated: ${tasksImportSummary.updatedTasks} • Tags: ${tasksImportSummary.createdTags}${tasksImportSummary.errorCount > 0 ? ` • Issues: ${tasksImportSummary.errorCount}` : ''}`,
                }
              : null
          }
          reflectionsImportSummary={
            reflectionsImportSummary
              ? {
                  totalRows: reflectionsImportSummary.totalRows,
                  errorCount: reflectionsImportSummary.errorCount,
                  firstErrors: reflectionsImportSummary.firstErrors,
                  detailLine: `Rows: ${reflectionsImportSummary.totalRows} • Created: ${reflectionsImportSummary.createdCount} • Updated: ${reflectionsImportSummary.updatedCount}${reflectionsImportSummary.errorCount > 0 ? ` • Issues: ${reflectionsImportSummary.errorCount}` : ''}`,
                }
              : null
          }
          notesImportSummary={
            notesImportSummary
              ? {
                  totalRows: notesImportSummary.totalRows,
                  errorCount: notesImportSummary.errorCount,
                  firstErrors: notesImportSummary.firstErrors,
                  detailLine: `Rows: ${notesImportSummary.totalRows} • Created: ${notesImportSummary.createdCount} • Updated: ${notesImportSummary.updatedCount}${notesImportSummary.errorCount > 0 ? ` • Issues: ${notesImportSummary.errorCount}` : ''}`,
                }
              : null
          }
          onExportTasksJson={() => void handleExportTasksJson()}
          onExportTasksCsv={() => void handleExportTasksCsv()}
          onExportReflectionsCsv={() => void handleExportReflectionsCsv()}
          onExportNotesCsv={() => void handleExportNotesCsv()}
          onTasksFileChange={(f) => void handleImportTasksFile(f)}
          onTasksMappingFileChange={(f) => void handleLoadTasksMappingFile(f)}
          onReflectionsFileChange={(f) => void handleImportReflectionsCsvFile(f)}
          onNotesFileChange={(f) => void handleImportNotesFile(f)}
          onResetHabitsFreshStart={() => void handleResetHabitsFreshStart()}
        />

        <DevSettingsSection />

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
