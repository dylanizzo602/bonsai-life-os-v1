/* App shell: root component; manages navigation state and renders active section */
import { BaseLayout, useNavigation } from '../features/layout'
import { HomePage } from '../features/home'
import { BriefingsPage } from '../features/briefings'
import { GoalsPage } from '../features/goals'
import { TasksPage } from '../features/tasks'
import { HabitsPage } from '../features/habits'
import { ReflectionsPage } from '../features/reflections'
import { SettingsPage } from '../features/settings'

/**
 * Main app component
 * Manages navigation state and renders the appropriate page based on active section
 */
function App() {
  /* Navigation hook: Manage active section state */
  const { activeSection, setActiveSection } = useNavigation('home')

  /* Content rendering: Render the appropriate page component based on active section */
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return <HomePage />
      case 'briefings':
        return <BriefingsPage />
      case 'goals':
        return <GoalsPage />
      case 'tasks':
        return <TasksPage />
      case 'habits':
        return <HabitsPage />
      case 'reflections':
        return <ReflectionsPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <HomePage />
    }
  }

  return (
    <BaseLayout activeSection={activeSection} onNavigate={setActiveSection}>
      {renderContent()}
    </BaseLayout>
  )
}

export default App
