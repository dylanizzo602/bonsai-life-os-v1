/* App shell: root component; manages auth gate, navigation state, and renders active section */
import { BaseLayout, useNavigation } from '../features/layout'
import { HomePage } from '../features/home'
import { BriefingsPage } from '../features/briefings'
import { GoalsPage } from '../features/goals'
import { TasksPage } from '../features/tasks'
import { HabitsPage } from '../features/habits'
import { ReflectionsPage } from '../features/reflections'
import { WeeklyBriefingPage } from '../features/weekly-briefing'
import { NotesPage } from '../features/notes'
import { SettingsPage } from '../features/settings'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { useAuth } from '../features/auth/AuthContext'
import { AuthScreen } from '../features/auth/AuthScreen'
import { useEffect, useRef, useState } from 'react'
import {
  getHasCompletedMorningBriefingToday,
  getHasCompletedWeeklyBriefingThisWeek,
} from '../lib/supabase/reflections'
import { useLocalNotificationScheduler } from '../features/notifications/hooks/useLocalNotificationScheduler'

/**
 * Screen too small message component
 * Displays when viewport width is less than 300px
 */
function ScreenTooSmallMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bonsai-slate-50 p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-page-title font-semibold text-bonsai-brown-700 mb-2">
          Display Too Small
        </h1>
        <p className="text-body text-bonsai-slate-600">
          Please view this application on a larger screen or device with a width of at least 300px.
        </p>
      </div>
    </div>
  )
}

/**
 * Main app component
 * Manages auth gate, navigation state, and renders the appropriate page based on active section
 */
function App() {
  /* Auth state: determine whether to show auth screen or main app */
  const { session, loading } = useAuth()

  /* Local notifications: schedule task/habit/briefing triggers while the app is open */
  useLocalNotificationScheduler()

  /* Viewport width detection: Check if screen is too small (< 300px) */
  const viewportWidth = useViewportWidth()
  const isScreenTooSmall = viewportWidth > 0 && viewportWidth < 300

  /* Morning briefing gate: determine whether today's briefing is already completed */
  const [hasCompletedMorningBriefingToday, setHasCompletedMorningBriefingToday] = useState<
    boolean | null
  >(null)
  const didApplyStartupGateRef = useRef(false)

  /* Navigation hook: Default to briefings until we confirm completion for today */
  const { activeSection, setActiveSection } = useNavigation('briefings')

  /* Startup gate effect: on app start, route to Briefing until completed today */
  useEffect(() => {
    if (!session) return

    let cancelled = false
    getHasCompletedMorningBriefingToday().then((completed) => {
      if (cancelled) return

      setHasCompletedMorningBriefingToday(completed)

      if (didApplyStartupGateRef.current) return
      didApplyStartupGateRef.current = true

      if (completed) {
        setActiveSection('home')
      } else {
        setActiveSection('briefings')
      }
    })

    return () => {
      cancelled = true
    }
  }, [session, setActiveSection])

  /* Content rendering: Render the appropriate page component based on active section */
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomePage onNavigate={setActiveSection} />
      case 'briefings':
        return (
          <BriefingsPage
            onNavigateToReflections={() => setActiveSection('reflections')}
            onClose={async () => {
              /* Sunday continuation: after morning briefing, prompt weekly briefing if not completed this week */
              const isSunday = new Date().getDay() === 0
              if (!isSunday) {
                setActiveSection('home')
                return
              }

              try {
                const hasCompletedWeekly = await getHasCompletedWeeklyBriefingThisWeek()
                setActiveSection(hasCompletedWeekly ? 'home' : 'weekly-briefing')
              } catch {
                setActiveSection('home')
              }
            }}
          />
        )
      case 'weekly-briefing':
        return <WeeklyBriefingPage />
      case 'goals':
        return <GoalsPage />
      case 'tasks':
        return <TasksPage />
      case 'habits':
        return <HabitsPage />
      case 'reflections':
        return (
          <ReflectionsPage
            onOpenMorningBriefing={() => setActiveSection('briefings')}
            onOpenWeeklyBriefing={() => setActiveSection('weekly-briefing')}
          />
        )
      case 'notes':
        return <NotesPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <HomePage />
    }
  }

  /* Conditional rendering: loading state while auth session is resolving */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bonsai-slate-50">
        <p className="text-body text-bonsai-slate-600">Loading your workspace…</p>
      </div>
    )
  }

  /* Conditional rendering: unauthenticated users see auth screen */
  if (!session) {
    return <AuthScreen />
  }

  /* Conditional rendering: avoid flashing non-briefing screens while briefing completion is loading */
  if (hasCompletedMorningBriefingToday === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bonsai-slate-50">
        <p className="text-body text-bonsai-slate-600">Loading your briefing…</p>
      </div>
    )
  }

  /* Conditional rendering: Show "screen too small" message if viewport < 320px, otherwise show app */
  if (isScreenTooSmall) {
    return <ScreenTooSmallMessage />
  }

  return (
    <BaseLayout activeSection={activeSection} onNavigate={setActiveSection}>
      {renderContent()}
    </BaseLayout>
  )
}

export default App
