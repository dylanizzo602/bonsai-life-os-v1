/* App shell: root component; manages auth gate, navigation state, and renders active section */
import { BaseLayout, useNavigation } from '../features/layout'
import { HomePage } from '../features/home'
import { BriefingsPage } from '../features/briefings'
import { GoalsPage } from '../features/goals'
import { TasksPage } from '../features/tasks'
import { HabitsPage } from '../features/habits'
import { ReflectionsPage } from '../features/reflections'
import { NotesPage } from '../features/notes'
import { SettingsPage } from '../features/settings'
import { FeedbackPage } from '../features/feedback'
import { useViewportWidth } from '../hooks/useViewportWidth'
import { useAuth } from '../features/auth/AuthContext'
import { AuthScreen } from '../features/auth/AuthScreen'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  getHasCompletedMorningBriefingToday,
} from '../lib/supabase/reflections'
import { useLocalNotificationScheduler } from '../features/notifications/hooks/useLocalNotificationScheduler'
import { useUserTimeZone } from '../features/settings/useUserTimeZone'
import { useDevMode } from '../features/settings/hooks/useDevMode'
import type { NavigationSection } from '../features/layout/hooks/useNavigation'

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
  const { session, loading, isPasswordRecovery } = useAuth()
  /* Timezone: ensures morning briefing completion checks align with the user's due-date semantics */
  const timeZone = useUserTimeZone()

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

  /* Continue session: reopen today's briefing from greeting with saved responses */
  const [briefingContinueSession, setBriefingContinueSession] = useState(false)
  const { devModeEnabled } = useDevMode()

  const navigateToSection = useCallback(
    (section: NavigationSection, options?: { continueMorningBriefing?: boolean }) => {
      if (section === 'briefings') {
        setBriefingContinueSession(options?.continueMorningBriefing ?? false)
      }
      setActiveSection(section)
    },
    [setActiveSection],
  )

  const closeBriefing = useCallback(() => {
    setBriefingContinueSession(false)
    setActiveSection('home')
  }, [setActiveSection])

  /* Startup gate effect: on app start, route to Briefing until completed today */
  useEffect(() => {
    if (!session) return

    let cancelled = false
    getHasCompletedMorningBriefingToday(timeZone).then((completed) => {
      if (cancelled) return

      setHasCompletedMorningBriefingToday(completed)

      if (didApplyStartupGateRef.current) return
      didApplyStartupGateRef.current = true

      if (completed) {
        setActiveSection('home')
      } else {
        setBriefingContinueSession(false)
        setActiveSection('briefings')
      }
    })

    return () => {
      cancelled = true
    }
  }, [session, setActiveSection, timeZone])

  /* Dev mode gate: hide briefing preview route when dev mode is off */
  useEffect(() => {
    if (activeSection === 'briefings-preview' && !devModeEnabled) {
      setActiveSection('home')
    }
  }, [activeSection, devModeEnabled, setActiveSection])

  /* OAuth / deep-link return: navigate to settings when ?section=settings is present */
  useEffect(() => {
    if (!session) return
    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section !== 'settings') return

    setActiveSection('settings')
    params.delete('section')
    const remaining = params.toString()
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (remaining ? `?${remaining}` : ''),
    )
  }, [session, setActiveSection])

  /* Content rendering: Render the appropriate page component based on active section */
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomePage onNavigate={navigateToSection} />
      case 'briefings':
        return (
          <BriefingsPage
            key={briefingContinueSession ? 'briefing-continue' : 'briefing-fresh'}
            continueSession={briefingContinueSession}
            onNavigateToReflections={() => setActiveSection('reflections')}
            onNavigateToSettings={() => setActiveSection('settings')}
            onClose={closeBriefing}
          />
        )
      case 'briefings-preview':
        if (!devModeEnabled) return <HomePage onNavigate={navigateToSection} />
        return (
          <BriefingsPage
            key="briefings-preview"
            previewMode
            onNavigateToReflections={() => setActiveSection('reflections')}
            onNavigateToSettings={() => setActiveSection('settings')}
            onClose={() => setActiveSection('home')}
          />
        )
      case 'reflections':
        return (
          <ReflectionsPage
            onOpenMorningBriefing={(continueSession) =>
              navigateToSection('briefings', { continueMorningBriefing: continueSession })
            }
          />
        )
      case 'goals':
        return <GoalsPage />
      case 'tasks':
        return <TasksPage />
      case 'habits':
        return <HabitsPage />
      case 'notes':
        return <NotesPage />
      case 'settings':
        return <SettingsPage />
      case 'feedback':
        return <FeedbackPage />
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

  /* Conditional rendering: auth screen for signed-out users and password recovery */
  if (!session || isPasswordRecovery) {
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
