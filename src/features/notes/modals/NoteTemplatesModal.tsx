/* NoteTemplatesModal: Library + Save Current UI for note templates (responsive) */
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { MaterialIcon } from '../../../components/MaterialIcon'
import type { NoteTemplate, NoteTemplateData } from '../types'
import type { NoteTemplateDraft, NoteTemplateIncludedFields } from '../utils/noteTemplateData'
import {
  DEFAULT_NOTE_TEMPLATE_INCLUDED_FIELDS,
  getNoteTemplateSummaryLine,
} from '../utils/noteTemplateData'
import { stripHtmlPreview } from '../utils/noteDisplayCore'

type ActiveTab = 'library' | 'saveCurrent'

const DEFAULT_ICON_CHOICES = [
  'description',
  'menu_book',
  'sticky_note_2',
  'article',
  'library_books',
  'edit_note',
  'topic',
  'lightbulb',
  'bookmark',
  'folder_open',
]

interface NoteTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  /** libraryApply: pick template to create note; docSave: save/overwrite current note */
  mode: 'libraryApply' | 'docSave'
  initialTab?: ActiveTab
  initialSelectedTemplateId?: string
  initialTemplateName?: string
  initialTemplateIcon?: string
  /** When true, Library tab shows Apply (empty note in doc view) */
  canApply?: boolean

  templates: NoteTemplate[]
  templatesLoading: boolean
  templatesError: string | null

  onApplyTemplate?: (data: NoteTemplateData, templateId: string) => void
  onDeleteTemplate: (id: string) => Promise<void>
  onCreateTemplate: (args: {
    name: string
    icon: string | null
    included: NoteTemplateIncludedFields
  }) => Promise<void>
  onOverwriteTemplate: (args: {
    id: string
    name?: string
    icon?: string | null
    included: NoteTemplateIncludedFields
  }) => Promise<void>

  draft: NoteTemplateDraft
}

export function NoteTemplatesModal({
  isOpen,
  onClose,
  mode,
  initialTab = 'library',
  initialSelectedTemplateId = '',
  initialTemplateName,
  initialTemplateIcon,
  canApply = false,
  templates,
  templatesLoading,
  templatesError,
  onApplyTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  onOverwriteTemplate,
  draft,
}: NoteTemplatesModalProps) {
  /* UI state: tab + search + save form controls */
  const [activeTab, setActiveTab] = useState<ActiveTab>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [templateName, setTemplateName] = useState('')
  const [templateIcon, setTemplateIcon] = useState<string>('description')
  const [included, setIncluded] = useState<NoteTemplateIncludedFields>(
    DEFAULT_NOTE_TEMPLATE_INCLUDED_FIELDS,
  )
  const [submitting, setSubmitting] = useState(false)

  const showSaveTab = mode === 'docSave'
  const showApply = (mode === 'libraryApply' || canApply) && Boolean(onApplyTemplate)

  /* Derived: matching templates for Library search */
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return templates
    return templates.filter((t) => t.name.toLowerCase().includes(q))
  }, [templates, searchQuery])

  /* Reset transient form state each time the modal opens */
  useEffect(() => {
    if (!isOpen) return
    setActiveTab(initialTab)
    setSearchQuery('')
    setSelectedTemplateId(initialSelectedTemplateId)
    setTemplateName(
      initialTemplateName != null
        ? initialTemplateName
        : draft.documentTitle?.trim()
          ? draft.documentTitle.trim()
          : '',
    )
    setTemplateIcon(initialTemplateIcon ?? 'description')
    setIncluded(DEFAULT_NOTE_TEMPLATE_INCLUDED_FIELDS)
    setSubmitting(false)
  }, [
    isOpen,
    draft.documentTitle,
    initialTab,
    initialSelectedTemplateId,
    initialTemplateName,
    initialTemplateIcon,
  ])

  const header = (
    <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 py-5">
      <h2 className="flex items-center text-body font-bold text-on-surface">
        <MaterialIcon name="content_copy" className="mr-2 text-primary" />
        Note Templates
      </h2>
      <button
        type="button"
        className="rounded-full p-2 transition-colors hover:bg-surface-container-high"
        onClick={onClose}
        aria-label="Close note templates"
      >
        <MaterialIcon name="close" className="text-on-surface-variant" />
      </button>
    </header>
  )

  const tabs = showSaveTab ? (
    <nav className="flex border-b border-outline-variant bg-surface-container-low px-6">
      <button
        type="button"
        onClick={() => setActiveTab('library')}
        className={`border-b-2 px-6 py-4 text-secondary uppercase tracking-wide ${
          activeTab === 'library'
            ? 'border-primary font-bold text-primary'
            : 'border-transparent font-semibold text-on-surface-variant transition-colors hover:text-on-surface'
        }`}
      >
        Library
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('saveCurrent')}
        className={`border-b-2 px-6 py-4 text-secondary uppercase tracking-wide ${
          activeTab === 'saveCurrent'
            ? 'border-primary font-bold text-primary'
            : 'border-transparent font-semibold text-on-surface-variant transition-colors hover:text-on-surface'
        }`}
      >
        Save Current
      </button>
    </nav>
  ) : null

  const IncludedFieldsGrid = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <IncludedFieldCheckbox
        label="Document title"
        description="Save notebook title"
        icon="title"
        checked={included.documentTitle}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, documentTitle: checked }))}
      />
      <IncludedFieldCheckbox
        label="Page content"
        description="Save rich text HTML"
        icon="description"
        checked={included.pageContent}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, pageContent: checked }))}
      />
      <IncludedFieldCheckbox
        label="Subpages"
        description="Include nested subpages"
        icon="subdirectory_arrow_right"
        checked={included.subpages}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, subpages: checked }))}
      />
      <IncludedFieldCheckbox
        label="Additional pages"
        description="Include all top-level tabs"
        icon="tab"
        checked={included.additionalPages}
        onChange={(checked) => setIncluded((prev) => ({ ...prev, additionalPages: checked }))}
      />
    </div>
  )

  const LibraryView = (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 bg-surface-container-lowest px-6 py-4">
        <div className="group relative flex-1">
          <MaterialIcon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-outline transition-colors group-focus-within:text-primary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border-none bg-surface-container-low py-2 pl-10 pr-4 text-secondary transition-all placeholder:text-outline focus:ring-2 focus:ring-primary/20"
            placeholder="Search saved templates..."
          />
        </div>
        <p className="text-secondary font-medium text-on-surface-variant">
          {templatesLoading ? 'Loading…' : `${templates.length} Templates saved`}
        </p>
      </div>

      <section className="scrollbar-hide flex-1 space-y-3 overflow-y-auto p-4 md:p-6">
        {templatesError && (
          <div className="rounded-xl border border-error/20 bg-error/5 p-3 text-secondary text-on-error-container">
            {templatesError}
          </div>
        )}

        {filteredTemplates.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface p-5">
            <p className="text-body font-semibold text-on-surface">No templates found</p>
            <p className="mt-1 text-secondary text-on-surface-variant">
              {mode === 'libraryApply'
                ? 'Save a template from an existing note to use it here.'
                : 'Create one from “Save Current”, then it will show up here.'}
            </p>
          </div>
        ) : (
          filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="group flex items-center rounded-xl border border-outline-variant bg-surface p-4 transition-all hover:border-primary/40"
            >
              <div className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MaterialIcon name={tmpl.icon ?? 'content_copy'} />
              </div>
              <div className="mr-4 min-w-0 flex-1">
                <h4 className="truncate text-body font-bold text-on-surface">{tmpl.name}</h4>
                <p className="line-clamp-1 text-secondary text-on-surface-variant">
                  {getNoteTemplateSummaryLine(tmpl.data)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {showApply && onApplyTemplate && (
                  <button
                    type="button"
                    className="rounded-lg border border-primary/20 px-3 py-1.5 text-secondary font-bold text-primary transition-all hover:bg-primary hover:text-on-primary"
                    onClick={() => onApplyTemplate(tmpl.data, tmpl.id)}
                  >
                    Apply
                  </button>
                )}
                {showSaveTab && (
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-secondary font-semibold text-on-surface-variant transition-all hover:bg-surface-container-high"
                    title="Overwrite this template with current note data"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id)
                      setActiveTab('saveCurrent')
                      setTemplateName(tmpl.name)
                      setTemplateIcon(tmpl.icon ?? 'description')
                    }}
                  >
                    Overwrite
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-on-surface-variant transition-all hover:bg-error/10 hover:text-error"
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

      {showSaveTab && (
        <footer className="flex items-center justify-between gap-4 border-t border-outline-variant bg-surface-container-low p-4 md:p-6">
          <p className="text-secondary text-on-surface-variant">
            Reuse notebook structures across your library.
          </p>
          <button
            type="button"
            className="rounded-xl bg-primary px-6 py-2.5 font-bold text-on-primary shadow-sm transition-all hover:opacity-90"
            onClick={() => {
              setSelectedTemplateId('')
              setActiveTab('saveCurrent')
            }}
          >
            Save as New Template
          </button>
        </footer>
      )}
    </main>
  )

  const saveCurrentFooter = (
    <div className="flex w-full justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl px-6 py-2.5 text-body font-bold text-on-surface-variant hover:bg-surface-container-high"
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
              await onOverwriteTemplate({
                id: selectedTemplateId,
                name,
                icon: templateIcon,
                included,
              })
            } else {
              await onCreateTemplate({
                name,
                icon: templateIcon,
                included,
              })
            }
            setActiveTab('library')
            setSelectedTemplateId('')
          } finally {
            setSubmitting(false)
          }
        }}
        className="rounded-xl bg-primary px-8 py-2.5 text-body font-bold text-on-primary shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? 'Saving…'
          : selectedTemplateId
            ? 'Overwrite Template'
            : 'Create Template'}
      </button>
    </div>
  )

  const previewPage = draft.pages[0]
  const previewContent = previewPage?.content ?? ''
  const previewText = stripHtmlPreview(previewContent)

  const SaveCurrentView = (
    <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="min-w-0 space-y-6 p-5 md:p-8">
        <div className="space-y-2">
          <label className="text-secondary font-bold uppercase tracking-widest text-outline">
            Template Name
          </label>
          <div className="flex min-w-0 gap-3">
            <button
              type="button"
              className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low transition-colors hover:bg-surface-container-high"
              title="Select icon"
              onClick={() => {
                const idx = DEFAULT_ICON_CHOICES.indexOf(templateIcon)
                const next = DEFAULT_ICON_CHOICES[(idx + 1) % DEFAULT_ICON_CHOICES.length]
                setTemplateIcon(next)
              }}
            >
              <MaterialIcon
                name={templateIcon}
                className="text-on-surface-variant group-hover:text-primary"
              />
            </button>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Weekly Review Notebook"
              className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {selectedTemplateId && (
            <p className="text-secondary text-on-surface-variant">
              Overwriting an existing template.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-secondary font-bold uppercase tracking-widest text-outline">
            Included Fields
          </h3>
          {IncludedFieldsGrid}
        </div>

        <section className="pt-2">
          <h3 className="mb-3 text-secondary font-bold uppercase tracking-widest text-outline">
            Template Preview
          </h3>
          <div className="min-w-0 space-y-4 rounded-2xl border border-outline-variant bg-surface-container-low p-4 shadow-sm md:p-5">
            <div className="min-w-0 space-y-1">
              <span className="text-secondary font-bold uppercase tracking-tighter text-primary/60">
                Document title
              </span>
              <p className="break-words text-body font-bold leading-tight text-on-surface">
                {draft.documentTitle?.trim() ? draft.documentTitle.trim() : 'Untitled'}
              </p>
            </div>
            <div className="min-w-0 space-y-1">
              <span className="text-secondary font-bold uppercase tracking-tighter text-primary/60">
                First page
              </span>
              <p className="break-words text-body font-semibold text-on-surface">
                {previewPage?.title?.trim() ? previewPage.title.trim() : 'Untitled'}
              </p>
              <p className="line-clamp-2 break-words text-secondary leading-relaxed text-on-surface-variant">
                {included.pageContent && previewText
                  ? previewText
                  : 'No content'}
              </p>
            </div>
            <div className="space-y-2 border-t border-outline-variant/30 pt-2">
              {included.additionalPages && (
                <div className="flex min-w-0 items-center gap-2">
                  <MaterialIcon name="tab" className="shrink-0 text-[14px] text-primary" />
                  <span className="truncate text-secondary font-bold text-on-surface">
                    Pages ({draft.pages.length})
                  </span>
                </div>
              )}
              {included.subpages && (
                <div className="flex min-w-0 items-center gap-2">
                  <MaterialIcon
                    name="subdirectory_arrow_right"
                    className="shrink-0 text-[14px] text-primary"
                  />
                  <span className="truncate text-secondary font-bold text-on-surface">
                    Subpages (
                    {draft.pages.reduce((sum, p) => sum + p.subpages.length, 0)})
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
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
      footer={activeTab === 'saveCurrent' && showSaveTab ? saveCurrentFooter : undefined}
      footerClassName="border-outline-variant bg-surface-container-low"
      fullScreenOnMobile
      overlayClassName="bg-black/15 p-0 backdrop-blur-md md:p-6"
      cardClassName="bg-surface md:rounded-2xl md:border md:border-outline-variant/20"
      bodyClassName="flex min-h-0 flex-col overflow-x-hidden p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === 'library' || !showSaveTab ? LibraryView : SaveCurrentView}
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
    <label className="flex cursor-pointer items-center rounded-xl border border-outline-variant bg-surface p-3 transition-colors hover:bg-surface-container-high">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mr-3 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-secondary font-bold text-on-surface">{label}</span>
        <span className="truncate text-secondary text-on-surface-variant">{description}</span>
      </div>
      <MaterialIcon name={icon} className="text-[18px] text-on-surface-variant/50" />
    </label>
  )
}
