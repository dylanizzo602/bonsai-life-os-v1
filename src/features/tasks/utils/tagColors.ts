/* tagColors: Shared full-spectrum tag palette (swatches, dots, pills) for pickers and task rows */

/** Canonical tag color ids — 20 hues spanning the full color wheel */
export type TagColorId =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
  | 'brown'
  | 'stone'
  | 'slate'

export interface TagColorOption {
  id: TagColorId
  label: string
  /** Solid swatch / list dot */
  swatchClass: string
  /** Pill background + text for task rows */
  pillClasses: string
}

/** Default color for newly created tags */
export const DEFAULT_TAG_COLOR: TagColorId = 'blue'

/** Full-spectrum palette: warm → cool → purple/pink → neutrals (5×4 grid) */
export const TAG_COLOR_OPTIONS: TagColorOption[] = [
  { id: 'red', label: 'Red', swatchClass: 'bg-red-500', pillClasses: 'bg-red-100 text-red-800' },
  { id: 'orange', label: 'Orange', swatchClass: 'bg-orange-500', pillClasses: 'bg-orange-100 text-orange-800' },
  { id: 'amber', label: 'Amber', swatchClass: 'bg-amber-500', pillClasses: 'bg-amber-100 text-amber-800' },
  { id: 'yellow', label: 'Yellow', swatchClass: 'bg-yellow-500', pillClasses: 'bg-yellow-100 text-yellow-800' },
  { id: 'lime', label: 'Lime', swatchClass: 'bg-lime-500', pillClasses: 'bg-lime-100 text-lime-800' },
  { id: 'green', label: 'Green', swatchClass: 'bg-green-500', pillClasses: 'bg-green-100 text-green-800' },
  { id: 'emerald', label: 'Emerald', swatchClass: 'bg-emerald-500', pillClasses: 'bg-emerald-100 text-emerald-800' },
  { id: 'teal', label: 'Teal', swatchClass: 'bg-teal-500', pillClasses: 'bg-teal-100 text-teal-800' },
  { id: 'cyan', label: 'Cyan', swatchClass: 'bg-cyan-500', pillClasses: 'bg-cyan-100 text-cyan-800' },
  { id: 'sky', label: 'Sky', swatchClass: 'bg-sky-500', pillClasses: 'bg-sky-100 text-sky-800' },
  { id: 'blue', label: 'Blue', swatchClass: 'bg-blue-500', pillClasses: 'bg-blue-100 text-blue-800' },
  { id: 'indigo', label: 'Indigo', swatchClass: 'bg-indigo-500', pillClasses: 'bg-indigo-100 text-indigo-800' },
  { id: 'violet', label: 'Violet', swatchClass: 'bg-violet-500', pillClasses: 'bg-violet-100 text-violet-800' },
  { id: 'purple', label: 'Purple', swatchClass: 'bg-purple-500', pillClasses: 'bg-purple-100 text-purple-800' },
  { id: 'fuchsia', label: 'Fuchsia', swatchClass: 'bg-fuchsia-500', pillClasses: 'bg-fuchsia-100 text-fuchsia-800' },
  { id: 'pink', label: 'Pink', swatchClass: 'bg-pink-500', pillClasses: 'bg-pink-100 text-pink-800' },
  { id: 'rose', label: 'Rose', swatchClass: 'bg-rose-500', pillClasses: 'bg-rose-100 text-rose-800' },
  { id: 'brown', label: 'Brown', swatchClass: 'bg-amber-800', pillClasses: 'bg-amber-100 text-amber-900' },
  { id: 'stone', label: 'Stone', swatchClass: 'bg-stone-500', pillClasses: 'bg-stone-100 text-stone-800' },
  { id: 'slate', label: 'Slate', swatchClass: 'bg-slate-500', pillClasses: 'bg-slate-100 text-slate-800' },
]

const TAG_COLOR_IDS = new Set<string>(TAG_COLOR_OPTIONS.map((c) => c.id))

/** Maps legacy tag color ids stored in older data to the full-spectrum palette */
const LEGACY_COLOR_MAP: Record<string, TagColorId> = {
  /* Original 6-color palette */
  mint: 'emerald',
  lavender: 'violet',
  periwinkle: 'indigo',
  /* Previous earth-tone palette */
  sage: 'green',
  moss: 'emerald',
  'pale-sage': 'lime',
  mist: 'lime',
  forest: 'green',
  navy: 'indigo',
  midnight: 'indigo',
  steel: 'slate',
  earth: 'brown',
  pebble: 'stone',
  charcoal: 'slate',
  ink: 'slate',
  cloud: 'stone',
  fog: 'stone',
  ash: 'stone',
  gravel: 'stone',
  shell: 'stone',
}

/** Normalize any stored color string to a known TagColorId */
export function normalizeTagColor(color: string | null | undefined): TagColorId {
  if (!color) return DEFAULT_TAG_COLOR
  if (TAG_COLOR_IDS.has(color)) return color as TagColorId
  return LEGACY_COLOR_MAP[color] ?? DEFAULT_TAG_COLOR
}

/** Lookup a color option by id (after normalization) */
export function getTagColorOption(color: string | null | undefined): TagColorOption {
  const id = normalizeTagColor(color)
  return TAG_COLOR_OPTIONS.find((c) => c.id === id) ?? TAG_COLOR_OPTIONS[0]
}

/** Solid dot class for tag list rows */
export function getTagDotClass(color: string | null | undefined): string {
  return getTagColorOption(color).swatchClass
}

/** Pill background + text classes for task rows */
export function getTagPillClasses(color: string | null | undefined): string {
  return getTagColorOption(color).pillClasses
}

/** Swatch class for the edit-tag color grid */
export function getTagSwatchClass(color: string | null | undefined): string {
  return getTagColorOption(color).swatchClass
}
