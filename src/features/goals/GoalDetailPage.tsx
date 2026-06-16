/* GoalDetailPage: backward-compatible wrapper around GoalDrawer */
import { GoalDrawer } from './GoalDrawer'

interface GoalDetailPageProps {
  /** Goal ID to display */
  goalId: string
  /** Back navigation handler */
  onBack: () => void
}

/**
 * @deprecated Use GoalDrawer directly. Kept for backward compatibility.
 */
export function GoalDetailPage({ goalId, onBack }: GoalDetailPageProps) {
  return <GoalDrawer goalId={goalId} onClose={onBack} onDeleted={onBack} />
}
