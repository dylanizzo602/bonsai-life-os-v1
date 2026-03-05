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

/**
 * Screen too small message component
 * Displays when viewport width is less than 320px
 */
function ScreenTooSmallMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bonsai-slate-50 p-4">
      <div className="text-center max-w-sm">
        <h1 className="text-page-title font-semibold text-bonsai-brown-700 mb-2">
          Display Too Small
        </h1>
        <p className="text-body text-bonsai-slate-600">
          Please view this application on a larger screen or device with a width of at least 320px.
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

  /* Viewport width detection: Check if screen is too small (< 320px) */
  const viewportWidth = useViewportWidth()
  const isScreenTooSmall = viewportWidth > 0 && viewportWidth < 320

  /* Navigation hook: Manage active section state */
  const { activeSection, setActiveSection } = useNavigation('home')

  /* Content rendering: Render the appropriate page component based on active section */
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomePage onNavigate={setActiveSection} />
      case 'briefings':
        return <BriefingsPage onNavigateToReflections={() => setActiveSection('reflections')} />
      case 'weekly-briefing':
        return <WeeklyBriefingPage />
      case 'goals':
        return <GoalsPage />
      case 'tasks':
        return <TasksPage />
      case 'habits':
        return <HabitsPage />
      case 'reflections':
        return <ReflectionsPage />
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
