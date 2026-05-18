/* placeholderNotifications: Sample in-app notifications until real notification feed ships */

export type NotificationCategory = 'Task' | 'Goal' | 'Habit'

export interface PlaceholderNotification {
  id: string
  title: string
  body: string
  timeAgo: string
  category: NotificationCategory
  icon: string
  iconContainerClass: string
  iconClass: string
  read: boolean
}

/** Static placeholder list matching the Zenith notifications modal design */
export const PLACEHOLDER_NOTIFICATIONS: PlaceholderNotification[] = [
  {
    id: 'task-due-soon',
    title: 'Task Due Soon',
    body: 'Finalize Q3 Strategy is due in 2 hours',
    timeAgo: '10m ago',
    category: 'Task',
    icon: 'task',
    iconContainerClass: 'bg-primary-container text-on-primary-container',
    iconClass: 'text-on-primary-container',
    read: false,
  },
  {
    id: 'goal-reached',
    title: 'Goal Reached',
    body: "You've completed 80% of your Monthly Writing Goal.",
    timeAgo: '45m ago',
    category: 'Goal',
    icon: 'flag',
    iconContainerClass: 'bg-secondary-container text-on-secondary-container',
    iconClass: 'text-on-secondary-container',
    read: false,
  },
  {
    id: 'habit-reminder',
    title: 'Habit Reminder',
    body: 'Time for your Afternoon Meditation session.',
    timeAgo: '3h ago',
    category: 'Habit',
    icon: 'self_improvement',
    iconContainerClass: 'bg-tertiary-fixed text-on-tertiary-fixed',
    iconClass: 'text-on-tertiary-fixed',
    read: true,
  },
  {
    id: 'task-completed',
    title: 'Task Completed',
    body: 'Project Briefing has been marked as complete.',
    timeAgo: 'Yesterday',
    category: 'Task',
    icon: 'assignment_turned_in',
    iconContainerClass: 'bg-surface-container-high text-outline',
    iconClass: 'text-outline',
    read: true,
  },
]
