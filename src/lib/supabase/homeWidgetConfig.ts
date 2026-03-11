/* homeWidgetConfig: Per-user home widget order/visibility stored in Supabase auth user metadata */
import { supabase } from './client'
import type { HomeWidgetId } from '../../features/home/hooks/useHomeWidgetConfig'

interface HomeWidgetConfigFromMetadata {
  /** Ordered list of widget IDs from user metadata */
  home_widget_order?: unknown
  /** Hidden widget IDs from user metadata */
  home_widget_hidden?: unknown
}

/**
 * Load home widget config (order + hidden) from the current Supabase auth user's metadata.
 * Returns null when there is no authenticated user or no widget metadata set.
 */
export async function getHomeWidgetConfigFromUser(): Promise<{
  order: HomeWidgetId[] | null
  hidden: Set<HomeWidgetId> | null
}> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    if (error) {
      console.error('Error fetching user for home widget config:', error)
    }
    return { order: null, hidden: null }
  }

  const metadata = (data.user.user_metadata ?? {}) as HomeWidgetConfigFromMetadata

  const rawOrder = Array.isArray(metadata.home_widget_order)
    ? (metadata.home_widget_order as unknown[])
    : null
  const rawHidden = Array.isArray(metadata.home_widget_hidden)
    ? (metadata.home_widget_hidden as unknown[])
    : null

  const order = rawOrder
    ?.filter((id): id is HomeWidgetId => typeof id === 'string')
    .map((id) => id as HomeWidgetId) ?? null

  const hiddenArray =
    rawHidden?.filter((id): id is HomeWidgetId => typeof id === 'string') ?? null

  return {
    order,
    hidden: hiddenArray ? new Set<HomeWidgetId>(hiddenArray) : null,
  }
}

/**
 * Persist home widget config (order + hidden) into the current Supabase auth user's metadata.
 * No-op when there is no authenticated user.
 */
export async function saveHomeWidgetConfigToUser(
  order: HomeWidgetId[],
  hidden: Set<HomeWidgetId>,
): Promise<void> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    if (error) {
      console.error('Error fetching user for saving home widget config:', error)
    }
    return
  }

  const currentMeta = (data.user.user_metadata ?? {}) as Record<string, unknown>
  const nextMeta = {
    ...currentMeta,
    home_widget_order: order,
    home_widget_hidden: [...hidden],
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: nextMeta,
  })

  if (updateError) {
    console.error('Error saving home widget config to user metadata:', updateError)
  }
}

