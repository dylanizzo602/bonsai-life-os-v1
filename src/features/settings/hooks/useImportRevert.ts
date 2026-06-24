/* Import revert hook: Load and undo the last CSV import */
import { useCallback, useEffect, useState } from 'react'
import {
  getLastImportRevertBatch,
  revertLastImport,
  type LastImportRevertBatch,
} from '../../../lib/supabase/importRevert'

export function useImportRevert() {
  const [batch, setBatch] = useState<LastImportRevertBatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [reverting, setReverting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLastImportRevertBatch()
      setBatch(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load revert state')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const revert = useCallback(async () => {
    setReverting(true)
    setError(null)
    try {
      await revertLastImport()
      setBatch(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revert failed')
      throw err
    } finally {
      setReverting(false)
    }
  }, [])

  return { batch, loading, reverting, error, refresh, revert }
}
