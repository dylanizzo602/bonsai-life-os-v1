/* DataManagementSettingsSection: Import/export cards and danger zone placeholders */

import type { ReactNode, RefObject } from 'react'
import { MaterialIcon, SettingsCard, SettingsSectionHeader } from '../components'
import type { ImportMode } from '../types/importExport'
import type { LastImportRevertBatch } from '../../../lib/supabase/importRevert'

export interface ImportSummary {
  totalRows: number
  errorCount: number
  firstErrors: string[]
  detailLine: string
}

export interface DataManagementSettingsSectionProps {
  tasksFileInputRef: RefObject<HTMLInputElement | null>
  tasksMappingFileInputRef: RefObject<HTMLInputElement | null>
  reflectionsFileInputRef: RefObject<HTMLInputElement | null>
  notesFileInputRef: RefObject<HTMLInputElement | null>
  importMode: ImportMode
  onImportModeChange: (mode: ImportMode) => void
  tasksImportLoading: boolean
  reflectionsImportLoading: boolean
  notesImportLoading: boolean
  habitsResetLoading: boolean
  habitsResetMessage: string | null
  tasksMappingError: string | null
  tasksMappingLoaded: boolean
  tasksImportSummary: ImportSummary | null
  reflectionsImportSummary: ImportSummary | null
  notesImportSummary: ImportSummary | null
  revertBatch: LastImportRevertBatch | null
  revertLoading: boolean
  reverting: boolean
  revertError: string | null
  onRevertLastImport: () => void
  onExportTasksJson: () => void
  onExportTasksCsv: () => void
  onExportReflectionsCsv: () => void
  onExportNotesCsv: () => void
  onTasksFileChange: (file: File) => void
  onTasksMappingFileChange: (file: File) => void
  onReflectionsFileChange: (file: File) => void
  onNotesFileChange: (file: File) => void
  onResetHabitsFreshStart: () => void
}

/**
 * Data import/export for tasks, reflections, and notes plus danger zone.
 */
export function DataManagementSettingsSection({
  tasksFileInputRef,
  tasksMappingFileInputRef,
  reflectionsFileInputRef,
  notesFileInputRef,
  importMode,
  onImportModeChange,
  tasksImportLoading,
  reflectionsImportLoading,
  notesImportLoading,
  habitsResetLoading,
  habitsResetMessage,
  tasksMappingError,
  tasksMappingLoaded,
  tasksImportSummary,
  reflectionsImportSummary,
  notesImportSummary,
  revertBatch,
  revertLoading,
  reverting,
  revertError,
  onRevertLastImport,
  onExportTasksJson,
  onExportTasksCsv,
  onExportReflectionsCsv,
  onExportNotesCsv,
  onTasksFileChange,
  onTasksMappingFileChange,
  onReflectionsFileChange,
  onNotesFileChange,
  onResetHabitsFreshStart,
}: DataManagementSettingsSectionProps) {
  const anyImportLoading = tasksImportLoading || reflectionsImportLoading || notesImportLoading

  const revertLabel = (() => {
    if (revertLoading) return 'Loading…'
    if (!revertBatch) return 'Revert last import'
    const { entity_type, summary, imported_at } = revertBatch
    const entity =
      entity_type === 'tasks'
        ? 'Tasks'
        : entity_type === 'reflections'
          ? 'Reflections'
          : 'Notes'
    const when = new Date(imported_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    return `Revert last import (${entity} · ${summary.createdCount} created · ${summary.updatedCount} updated · ${when})`
  })()

  return (
    <section>
      <SettingsSectionHeader icon="database" title="Data Management" />

      <div className="space-y-6">
        {/* Global import mode + revert */}
        <SettingsCard className="p-6">
          <h3 className="text-body mb-2 font-semibold text-on-surface">Import options</h3>
          <p className="text-secondary mb-4 text-on-surface-variant">
            Default imports create new records. Merge updates rows when the CSV{' '}
            <span className="font-mono text-xs">id</span> column matches an existing record.
            Only the most recent import can be reverted.
          </p>
          <label className="text-secondary mb-4 flex cursor-pointer items-center gap-2 text-on-surface-variant">
            <input
              type="checkbox"
              checked={importMode === 'merge'}
              onChange={(e) => onImportModeChange(e.target.checked ? 'merge' : 'create')}
              className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            Merge existing records by ID
          </label>
          <button
            type="button"
            onClick={onRevertLastImport}
            disabled={!revertBatch || revertLoading || reverting || anyImportLoading}
            className="text-secondary text-xs font-bold uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
          >
            {reverting ? 'Reverting…' : revertLabel}
          </button>
          {revertError ? <p className="text-secondary mt-2 text-error">{revertError}</p> : null}
        </SettingsCard>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <DataCard
            title="Tasks"
            icon="import_export"
            description="Full task export: subtasks, tags, checklists, dependencies, goals, and habits."
            templateHref="/templates/tasks-import-template.csv"
            onImport={() => tasksFileInputRef.current?.click()}
            onExportJson={onExportTasksJson}
            onExportCsv={onExportTasksCsv}
            importLabel={tasksImportLoading ? 'Importing…' : 'Import'}
            importDisabled={tasksImportLoading}
            extraActions={
              <button
                type="button"
                onClick={() => tasksMappingFileInputRef.current?.click()}
                className="rounded bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
              >
                Load mapping
              </button>
            }
            summary={tasksImportSummary}
            mappingError={tasksMappingError}
            mappingLoaded={tasksMappingLoaded}
          />
          <DataCard
            title="Reflections"
            icon="auto_stories"
            description="Journal, daily briefing, weekly review, and goal completion reflections."
            templateHref="/templates/reflections-import-template.csv"
            onImport={() => reflectionsFileInputRef.current?.click()}
            onExportCsv={onExportReflectionsCsv}
            importLabel={reflectionsImportLoading ? 'Importing…' : 'Import'}
            importDisabled={reflectionsImportLoading}
            summary={reflectionsImportSummary}
          />
          <DataCard
            title="Notes"
            icon="description"
            description="Main note title and primary page content only (no folders or extra tabs)."
            templateHref="/templates/notes-import-template.csv"
            onImport={() => notesFileInputRef.current?.click()}
            onExportCsv={onExportNotesCsv}
            importLabel={notesImportLoading ? 'Importing…' : 'Import'}
            importDisabled={notesImportLoading}
            summary={notesImportSummary}
          />
        </div>

        <input
          ref={tasksFileInputRef}
          type="file"
          accept=".csv,text/csv,.json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ''
            if (f) onTasksFileChange(f)
          }}
        />
        <input
          ref={tasksMappingFileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ''
            if (f) onTasksMappingFileChange(f)
          }}
        />
        <input
          ref={reflectionsFileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ''
            if (f) onReflectionsFileChange(f)
          }}
        />
        <input
          ref={notesFileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            e.target.value = ''
            if (f) onNotesFileChange(f)
          }}
        />

        <div className="border-t border-outline-variant/20 pt-8">
          <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.05em] text-error/70">Danger Zone</h3>
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-between gap-6 rounded-xl border border-error/10 bg-error-container/5 p-8 md:flex-row">
              <div className="flex-1">
                <h4 className="text-body font-semibold text-on-surface">Reset habits</h4>
                <p className="text-secondary text-on-surface-variant">
                  Clear habit log history and reminder notifications, then reschedule every habit from today as if
                  newly created. Habit names and settings are kept.
                </p>
                {habitsResetMessage ? (
                  <p className="text-secondary mt-2 text-primary">{habitsResetMessage}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onResetHabitsFreshStart}
                disabled={habitsResetLoading}
                className="rounded-lg border border-error px-6 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:opacity-50"
              >
                {habitsResetLoading ? 'Resetting…' : 'Reset habits'}
              </button>
            </div>

            <div className="flex flex-col items-center justify-between gap-6 rounded-xl border border-error/10 bg-error-container/5 p-8 md:flex-row">
              <div className="flex-1">
                <h4 className="text-body font-semibold text-on-surface">Critical Actions</h4>
                <p className="text-secondary text-on-surface-variant">
                  Permanently remove your data or reset your progress. These actions cannot be undone.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg border border-error px-6 py-2 text-sm font-semibold text-error opacity-60"
                >
                  Reset Account
                </button>
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-lg bg-error px-6 py-2 text-sm font-semibold text-on-error opacity-60 shadow-sm"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DataCard({
  title,
  icon,
  description,
  templateHref,
  onImport,
  onExportJson,
  onExportCsv,
  importLabel,
  importDisabled,
  extraActions,
  summary,
  mappingError,
  mappingLoaded,
}: {
  title: string
  icon: string
  description: string
  templateHref: string
  onImport: () => void
  onExportJson?: () => void
  onExportCsv?: () => void
  importLabel: string
  importDisabled?: boolean
  extraActions?: ReactNode
  summary: ImportSummary | null
  mappingError?: string | null
  mappingLoaded?: boolean
}) {
  return (
    <SettingsCard className="group p-6 transition-colors hover:border-primary/40">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-body font-semibold text-on-surface">{title}</h3>
        <MaterialIcon
          name={icon}
          className="text-outline transition-colors group-hover:text-primary"
        />
      </div>
      <p className="text-secondary mb-4 text-on-surface-variant">{description}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onImport}
          disabled={importDisabled}
          className="text-secondary text-xs font-bold uppercase tracking-wider text-primary hover:underline disabled:opacity-50"
        >
          {importLabel}
        </button>
        {onExportJson ? (
          <button
            type="button"
            onClick={() => void onExportJson()}
            className="text-secondary text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Export JSON
          </button>
        ) : null}
        {onExportCsv ? (
          <button
            type="button"
            onClick={() => void onExportCsv()}
            className="text-secondary text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Export CSV
          </button>
        ) : null}
        <a
          href={templateHref}
          download
          className="rounded bg-surface-container-low px-2 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          Download Template
        </a>
        {extraActions}
      </div>
      {mappingError ? <p className="text-secondary mt-3 text-error">{mappingError}</p> : null}
      {mappingLoaded && !mappingError ? (
        <p className="text-secondary mt-3 text-on-surface-variant">Mapping loaded for imports.</p>
      ) : null}
      {summary ? (
        <div className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2">
          <p className="text-secondary text-on-surface-variant">{summary.detailLine}</p>
          {summary.firstErrors.length > 0 ? (
            <ul className="text-secondary mt-1 list-disc pl-5 text-error">
              {summary.firstErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </SettingsCard>
  )
}
