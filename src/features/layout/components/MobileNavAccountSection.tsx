/* MobileNavAccountSection: Profile row + Settings / Log out actions for mobile nav */

import { useMemo } from 'react'
import { MaterialIcon } from '../../../components/MaterialIcon'
import { useAuth } from '../../auth/AuthContext'
import {
  getProfileAvatarUrl,
  getProfileDisplayName,
  getProfileInitials,
  getSubscriptionPlanLabel,
} from '../utils/userDisplay'

interface MobileNavAccountSectionProps {
  /** Open settings (profile) and close the nav overlay */
  onOpenSettings: () => void
  /** Close the nav overlay (e.g. before sign out) */
  onClose?: () => void
}

const actionButtonClass =
  'flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant/25 bg-surface-container-low px-3 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface active:scale-[0.98]'

/**
 * Bottom account block: profile summary with chevron, Settings and Log out buttons.
 */
export function MobileNavAccountSection({ onOpenSettings, onClose }: MobileNavAccountSectionProps) {
  const { user, signOut } = useAuth()

  /* Profile display: name, plan, avatar */
  const displayName = useMemo(() => getProfileDisplayName(user), [user])
  const planLabel = useMemo(() => getSubscriptionPlanLabel(user), [user])
  const initials = useMemo(() => getProfileInitials(user), [user])
  const avatarUrl = useMemo(() => getProfileAvatarUrl(user), [user])

  const handleLogOut = async () => {
    onClose?.()
    try {
      await signOut()
    } catch {
      /* Auth layer surfaces errors elsewhere */
    }
  }

  return (
    <div className="shrink-0 border-t border-outline-variant/15 pt-4">
      {/* Profile row: avatar, name, plan, chevron → settings */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="mb-3 flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-surface-container-low"
        aria-label={`${displayName}, ${planLabel}. Open account settings`}
      >
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-high"
          aria-hidden
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-body font-semibold text-primary">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-bold text-on-surface">{displayName}</p>
          <p className="text-secondary text-on-surface-variant">{planLabel}</p>
        </div>
        <MaterialIcon name="chevron_right" className="shrink-0 text-[22px] text-outline" />
      </button>

      {/* Action buttons: Settings and Log out */}
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onOpenSettings} className={actionButtonClass}>
          <MaterialIcon name="settings" className="text-[20px]" />
          <span className="text-body font-semibold">Settings</span>
        </button>
        <button type="button" onClick={() => void handleLogOut()} className={actionButtonClass}>
          <MaterialIcon name="logout" className="text-[20px]" />
          <span className="text-body font-semibold">Log out</span>
        </button>
      </div>
    </div>
  )
}
