/* App shell: root component; wraps content in BaseLayout (see features/layout) */
import { BaseLayout } from '../features/layout'
import { TaskList } from '../features/tasks'

function App() {
  return (
    <BaseLayout>
      {/* Main task management interface */}
      <TaskList />
    </BaseLayout>
  )
}

export default App
