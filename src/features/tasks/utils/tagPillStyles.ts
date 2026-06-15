/* tagPillStyles: Shared tag pill Tailwind classes for task rows */

import type { Tag } from '../types'
import { getTagPillClasses } from './tagColors'

export { TAG_COLOR_OPTIONS, DEFAULT_TAG_COLOR, getTagDotClass, getTagPillClasses } from './tagColors'

/** Lineup card tag pill (uppercase tracking per mock) */
export function getLineupTagPillClassName(tag: Tag): string {
  return `shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getTagPillClasses(tag.color)}`
}

/** Backlog row tag pill */
export function getBacklogTagPillClassName(tag: Tag): string {
  return `shrink-0 rounded bg-surface-container-high px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getTagPillClasses(tag.color)}`
}
