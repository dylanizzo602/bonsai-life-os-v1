/* tagPillStyles: Shared tag pill Tailwind classes for task rows */

import type { Tag, TagColorId } from '../types'

const TAG_COLORS: { id: TagColorId; bgClass: string; textClass: string }[] = [
  { id: 'slate', bgClass: 'bg-bonsai-slate-100', textClass: 'text-bonsai-slate-700' },
  { id: 'mint', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
  { id: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
  { id: 'lavender', bgClass: 'bg-violet-100', textClass: 'text-violet-800' },
  { id: 'yellow', bgClass: 'bg-amber-100', textClass: 'text-amber-800' },
  { id: 'periwinkle', bgClass: 'bg-indigo-100', textClass: 'text-indigo-800' },
]

/** Tailwind classes for a colored tag pill */
export function getTagPillClasses(color: TagColorId): string {
  const found = TAG_COLORS.find((c) => c.id === color)
  return found
    ? `${found.bgClass} ${found.textClass}`
    : `${TAG_COLORS[0].bgClass} ${TAG_COLORS[0].textClass}`
}

/** Lineup card tag pill (uppercase tracking per mock) */
export function getLineupTagPillClassName(tag: Tag): string {
  return `shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getTagPillClasses(tag.color)}`
}

/** Backlog row tag pill */
export function getBacklogTagPillClassName(tag: Tag): string {
  return `shrink-0 rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTagPillClasses(tag.color)}`
}
