/* TaskTemplatesModal: Library + Save Current UI for task templates (responsive) */
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { TaskTemplate, TaskTemplateData, Task } from '../types'
import type { DraftChecklistInput, TemplateIncludedFields } from '../utils/taskTemplateData'
import {
  DEFAULT_TEMPLATE_INCLUDED_FIELDS,
  getTemplateSummaryLine,
} from '../utils/taskTemplateData'

type ActiveTab = 'library' | 'saveCurrent'

const DEFAULT_ICON_CHOICES = [
  'calendar_today',
  'rocket_launch',
  'bolt',
  'checklist',
  'account_tree',
  'description',
  'sell',
  'sync',
  'attach_file',
  'schedule',
]

interface TaskTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'add' | 'edit'
  initialTab?: ActiveTab
  initialSelectedTemplateId?: string
  initialTemplateName?: string
  initialTemplateIcon?: string

  /* Template collection: provided by useTaskTemplates hook */
  templates: TaskTemplate[]
  templatesLoading: boolean
  templatesError: string | null

  /* Library actions */
  onApplyTemplate?: (data: TaskTemplateData, templateId: string) => void
  onDeleteTemplate: (id: string) => Promise<void>

  /* Create/overwrite from draft state (add mode) */
  onCreateFromDraft: (args: {
    name: string
    icon: string | null
    included: TemplateIncludedFields
    title: string
    description: string | null
    priority: Task['priority']
    goal_id: string | null
    time_estimate: number | null
    attachments: Task['attachments']
    recurrence_pattern: string | null
    tags: Task['tags']
    draftChecklists: DraftChecklistInput[]
    draftSubtasks: string[]
  }) => Promise<void>
  onOverwriteFromDraft: (args: {
    id: string
    name?: string
    icon?: string | null
    included: TemplateIncludedFields
    title: string
    description: string | null
    priority: Task['priority']
    goal_id: string | null
    time_estimate: number | null
    attachments: Task['attachments']
    recurrence_pattern: string | null
    tags: Task['tags']
    draftChecklists: DraftChecklistInput[]
    draftSubtasks: string[]
  }) => Promise<void>

  /* Create/overwrite from persisted task snapshot (edit mode) */
  onCreateFromTask: (args: {
    name: string
    icon: string | null
    included: TemplateIncludedFields
  }) => Promise<void>
  onOverwriteFromTask: (args: {
    id: string
    name?: string
    icon?: string | null
    included: TemplateIncludedFields
  }) => Promise<void>

  /* Current form/task state (used for Save Current + overwrite in add mode) */
  draft: {
    title: string
    description: string
    priority: Task['priority']
    goal_id: string | null
    time_estimate: number | null
    attachments: Task['attachments']
    recurrence_pattern: string | null
    tags: Task['tags']
    draftChecklists: DraftChecklistInput[]
    draftSubtasks: string[]
  }
}

export function TaskTemplatesModal({
  isOpen,
  onClose,
  mode,
  initialTab = 'library',
  initialSelectedTemplateId = '',
  initialTemplateName,
  initialTemplateIcon,
  templates,
  templatesLoading,
  templatesError,
  onApplyTemplate,
  onDeleteTemplate,
  onCreateFromDraft,
  onOverwriteFromDraft,
  onCreateFromTask,
  onOverwriteFromTask,
  draft,
}: TaskTemplatesModalProps) {
  /* UI state: tab + search + save form controls */
  const [activeTab, setActiveTab] = useState<ActiveTab>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateName, setTemplateName] = useState('')
  const [templateIcon, setTemplateIcon] = useState<string>('calendar_today')
  const [included, setIncluded] = useState<TemplateIncludedFields>(DEFAULT_TEMPLATE_INCLUDED_FIELDS)
  const [submitting, setSubmitting] = useState(false)

  /* Derived: show matching templates for Library search. */
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  /* Reset transient form state each time the modal opens. */
  useEffect(() => {
    if (!isOpen) return
    setActiveTab(initialTab)
    setSearchQuery('')
    setSelectedTemplateId(initialSelectedTemplateId)
    setTemplateName(
      initialTemplateName != null
        ? initialTemplateName
        : draft.title?.trim()
          ? draft.title.trim()
          : '',
    )
    setTemplateIcon(initialTemplateIcon ?? 'calendar_today')
    setIncluded(DEFAULT_TEMPLATE_INCLUDED_FIELDS)
    setSubmitting(false)
  }, [
    isOpen,
    draft.title,
    initialTab,
    initialSelectedTemplateId,
    initialTemplateName,
    initialTemplateIcon,
  ])

  /* Header: title left, close right */
  const header = (
    <header className="px-6 py-5 flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest">
      <h2 className="text-body font-bold text-on-surface flex items-center">
        <MaterialIcon name="content_copy" className="text-primary mr-2" />
        Task Templates
      </h2>
      <button
        type="button"
        className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
        onClick={onClose}
        aria-label="Close task templates"
      >
        <MaterialIcon name="close" className="text-on-surface-variant" />
      </button>
    </header>
  )

  /* Tabs: Library / Save Current */
  const tabs = (
    <nav className="flex px-6 border-b border-outline-variant bg-surface-container-low">
      <button
        type="button"
        onClick={() => setActiveTab('library')}
        className={`px-6 py-4 text-secondary tracking-wide uppercase border-b-2 ${
          activeTab === 'library'
            ? 'font-bold border-primary text-primary'
            : 'font-semibold border-transparent text-on-surface-variant hover:text-on-surface transition-colors'
        }`}
      >
        Library
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('saveCurrent')}
        className={`px-6 py-4 text-secondary tracking-wide uppercase border-b-2 ${
          activeTab === 'saveCurrent'
            ? 'font-bold border-primary text-primary'
            : 'font-semibold border-transparent text-on-surface-variant hover:text-on-surface transition-colors'
        }`}
      >
        Save Current
      </button>
    </nav>
  )

  /* Shared: checkbox row for included fields */
  const IncludedFieldsGrid = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <IncludedFieldCheckbox
        label="Checklists"
        description="Save all checklist items"
        icon="checklist"
        checked={included.checklists}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, checklists: checked }))}
      />
      <IncludedFieldCheckbox
        label="Subtasks"
        description="Include hierarchical tasks"
        icon="account_tree"
        checked={included.subtasks}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, subtasks: checked }))}
      />
      <IncludedFieldCheckbox
        label="Descriptions"
        description="Save task notes & details"
        icon="description"
        checked={included.description}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, description: checked }))}
      />
      <IncludedFieldCheckbox
        label="Tags & Labels"
        description="Keep organization consistent"
        icon="sell"
        checked={included.tags}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, tags: checked }))}
      />
      <IncludedFieldCheckbox
        label="Dates & Repeating Settings"
        description="Save recurrence rules (dates are not applied)"
        icon="sync"
        checked={included.repeatingSettings}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, repeatingSettings: checked }))}
      />
      <IncludedFieldCheckbox
        label="Attachments"
        description="Keep linked file references"
        icon="attach_file"
        checked={included.attachments}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, attachments: checked }))}
      />
      <IncludedFieldCheckbox
        label="Time Estimates"
        description="Include planned effort"
        icon="schedule"
        checked={included.timeEstimates}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, timeEstimates: checked }))}
      />
      <IncludedFieldCheckbox
        label="Goal link"
        description="Save linked goal"
        icon="flag"
        checked={included.goal}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, goal: checked }))}
      />
      <IncludedFieldCheckbox
        label="Priority"
        description="Save priority selection"
        icon="priority_high"
        checked={included.priority}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, priority: checked }))}
      />
    </div>
  )

  /* Library view */
  const LibraryView = (
    <main className="flex-1 overflow-hidden flex flex-col">
      <div className="px-6 py-4 bg-surface-container-lowest flex items-center justify-between gap-4">
        <div className="relative flex-1 group">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-xl"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-primary/20 text-secondary placeholder:text-outline transition-all"
            placeholder="Search saved templates..."
          />
        </div>
        <p className="text-secondary text-on-surface-variant font-medium">
          {templatesLoading ? 'Loading…' : `${templates.length} Templates saved`}
        </p>
      </div>

      <section className="flex-1 p-4 md:p-6 overflow-y-auto scrollbar-hide space-y-3">
        {templatesError && (
          <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-secondary text-on-error-container">
            {templatesError}
          </div>
        )}

        {filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface p-5">
            <p className="text-body font-semibold text-on-surface">No templates found</p>
            <p className="text-secondary text-on-surface-variant mt-1">
              Create one from “Save Current”, then it will show up here.
            </p>
          </div>
        ) : (
          filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group p-4 bg-surface border border-outline-variant hover:border-primary/40 rounded-xl flex items-center transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mr-4 shrink-0">
                <MaterialIcon name={tmpl.icon ?? 'content_copy'} />
              </div>
              <div className="flex-1 min-w-0 mr-4">
                <h4 className="text-body font-bold text-on-surface truncate">{tmpl.name}</h4>
                <p className="text-secondary text-on-surface-variant line-clamp-1">
                  {getTemplateSummaryLine(tmpl.data)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mode === 'add' && onApplyTemplate && (
                  <button
                    type="button"
                    className="px-3 py-1.5 text-secondary font-bold text-primary hover:bg-primary hover:text-on-primary border border-primary/20 rounded-lg transition-all"
                    onClick={() => onApplyTemplate(tmpl.data, tmpl.id)}
                  >
                    Apply
                  </button>
                )}
                <button
                  type="button"
                  className="px-3 py-1.5 text-secondary font-semibold text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
                  title="Overwrite this template with current task data"
                  onClick={async () => {
                    setSelectedTemplateId(tmpl.id)
                    setActiveTab('saveCurrent')
                    setTemplateName(tmpl.name)
                    setTemplateIcon(tmpl.icon ?? 'calendar_today')
                  }}
                >
                  Overwrite
                </button>
                <button
                  type="button"
                  className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                  onClick={async () => {
                    await onDeleteTemplate(tmpl.id)
                    if (selectedTemplateId === tmpl.id) setSelectedTemplateId('')
                  }}
                  aria-label={`Delete template ${tmpl.name}`}
                >
                  <MaterialIcon name="delete" className="text-[20px]" />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <footer className="p-4 md:p-6 bg-surface-container-low border-t border-outline-variant flex justify-between items-center gap-4">
        <p className="text-secondary text-on-surface-variant">
          Manage your workflow efficiency with templates.
        </p>
        <button
          type="button"
          className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all shadow-sm"
          onClick={() => {
            setSelectedTemplateId('')
            setActiveTab('saveCurrent')
          }}
        >
          Save as New Template
        </button>
      </footer>
    </main>
  )

  /* Save Current view */
  const SaveCurrentView = (
    <main className="flex-1 overflow-y-auto flex flex-col">
      <div className="p-5 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8">
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <label className="text-secondary font-bold text-outline uppercase tracking-widest">
              Template Name
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                className="w-12 h-12 flex items-center justify-center bg-surface-container-low border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors group shrink-0"
                title="Select icon"
                onClick={() => {
                  const idx = DEFAULT_ICON_CHOICES.indexOf(templateIcon)
                  const next = DEFAULT_ICON_CHOICES[(idx + 1) % DEFAULT_ICON_CHOICES.length]
                  setTemplateIcon(next)
                }}
              >
                <MaterialIcon name={templateIcon} className="text-on-surface-variant group-hover:text-primary" />
              </button>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Marketing Sprint Checklist"
                className="flex-1 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 text-body"
              />
            </div>
            {selectedTemplateId && (
              <p className="text-secondary text-on-surface-variant">
                Overwriting an existing template.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-secondary font-bold text-outline uppercase tracking-widest">
              Included Fields
            </h3>
            {IncludedFieldsGrid}
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <h3 className="text-secondary font-bold text-outline uppercase tracking-widest mb-4">
            Template Preview
          </h3>
          <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="space-y-1">
              <span className="text-secondary font-bold text-primary/60 uppercase tracking-tighter">
                Task Name
              </span>
              <p className="text-body font-bold text-on-surface leading-tight">
                {draft.title?.trim() ? draft.title.trim() : 'Untitled task'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-secondary font-bold text-primary/60 uppercase tracking-tighter">
                Description
              </span>
              <p className="text-secondary text-on-surface-variant leading-relaxed line-clamp-2">
                {draft.description?.trim() ? draft.description.trim() : 'No description'}
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-outline-variant/30">
              {included.checklists && (
                <div className="flex items-center gap-2">
                  <MaterialIcon name="checklist" className="text-[14px] text-primary" />
                  <span className="text-secondary font-bold text-on-surface">
                    Checklists ({draft.draftChecklists.length})
                  </span>
                </div>
              )}
              {included.subtasks && (
                <div className="flex items-center gap-2">
                  <MaterialIcon name="account_tree" className="text-[14px] text-primary" />
                  <span className="text-secondary font-bold text-on-surface">
                    Subtasks ({draft.draftSubtasks.length})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto p-4 md:p-6 bg-surface-container-low border-t border-outline-variant flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-body font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !templateName.trim()}
          onClick={async () => {
            const name = templateName.trim()
            if (!name) return
            setSubmitting(true)
            try {
              if (selectedTemplateId) {
                if (mode === 'edit') {
                  await onOverwriteFromTask({
                    id: selectedTemplateId,
                    name,
                    icon: templateIcon,
                    included,
                  })
                } else {
                  await onOverwriteFromDraft({
                    id: selectedTemplateId,
                    name,
                    icon: templateIcon,
                    included,
                    title: draft.title,
                    description: draft.description ?? null,
                    priority: draft.priority,
                    goal_id: draft.goal_id,
                    time_estimate: draft.time_estimate,
                    attachments: draft.attachments,
                    recurrence_pattern: draft.recurrence_pattern,
                    tags: draft.tags,
                    draftChecklists: draft.draftChecklists,
                    draftSubtasks: draft.draftSubtasks,
                  })
                }
              } else {
                if (mode === 'edit') {
                  await onCreateFromTask({
                    name,
                    icon: templateIcon,
                    included,
                  })
                } else {
                  await onCreateFromDraft({
                    name,
                    icon: templateIcon,
                    included,
                    title: draft.title,
                    description: draft.description ?? null,
                    priority: draft.priority,
                    goal_id: draft.goal_id,
                    time_estimate: draft.time_estimate,
                    attachments: draft.attachments,
                    recurrence_pattern: draft.recurrence_pattern,
                    tags: draft.tags,
                    draftChecklists: draft.draftChecklists,
                    draftSubtasks: draft.draftSubtasks,
                  })
                }
              }
              setActiveTab('library')
              setSelectedTemplateId('')
            } finally {
              setSubmitting(false)
            }
          }}
          className="px-8 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-body shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? 'Saving…'
            : selectedTemplateId
              ? 'Overwrite Template'
              : 'Create Template'}
        </button>
      </footer>
    </main>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={
        <div>
          {header}
          {tabs}
        </div>
      }
      fullScreenOnMobile
      /* Mobile: full-screen (no padding, no rounding). md+: centered dialog with blur + rounded card */
      overlayClassName="p-0 backdrop-blur-md bg-black/15 md:p-6"
      cardClassName="bg-surface md:rounded-2xl md:border md:border-outline-variant/20"
    >
      <div className="flex flex-col h-full min-h-0">
        {activeTab === 'library' ? LibraryView : SaveCurrentView}
      </div>
    </Modal>
  )
}

function IncludedFieldCheckbox({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string
  description: string
  icon: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center p-3 bg-surface border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 mr-3"
      />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-secondary font-bold text-on-surface truncate">{label}</span>
        <span className="text-secondary text-on-surface-variant truncate">{description}</span>
      </div>
      <MaterialIcon name={icon} className="text-[18px] text-on-surface-variant/50" />
    </label>
  )
}

