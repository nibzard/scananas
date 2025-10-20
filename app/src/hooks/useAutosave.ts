import { useCallback, useRef, useEffect } from 'react'
import type { BoardDocument } from '../model/types'
import {
  autosaveDocument,
  setDocumentDirty,
  setCurrentDocumentPath,
  getAutosaveStatus,
  checkRecoveryFiles
} from '../bridge/tauri'

interface AutosaveConfig {
  interval: number // autosave interval in milliseconds (default: 30000 = 30 seconds)
  idleDelay: number // idle delay in milliseconds (default: 5000 = 5 seconds)
}

interface AutosaveInfo {
  original_path: string
  recovery_path: string
  timestamp: string
}

export function useAutosave(
  doc: BoardDocument,
  currentFilePath: string | null,
  isDirty: boolean = false,
  config: Partial<AutosaveConfig> = {}
) {
  const {
    interval = 30000, // 30 seconds
    idleDelay = 5000   // 5 seconds of inactivity
  } = config

  const lastActivityRef = useRef<number>(Date.now())
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isAutosavingRef = useRef<boolean>(false)
  const lastAutosaveDocRef = useRef<string>('')
  const currentFilePathRef = useRef<string | null>(null)

  // Track file path changes
  useEffect(() => {
    if (currentFilePath !== currentFilePathRef.current) {
      currentFilePathRef.current = currentFilePath
      if (currentFilePath) {
        setCurrentDocumentPath(currentFilePath)
      }
    }
  }, [currentFilePath])

  // Track dirty state
  useEffect(() => {
    setDocumentDirty(isDirty)
  }, [isDirty])

  // Function to perform autosave
  const performAutosave = useCallback(async (force: boolean = false) => {
    // Don't autosave if no file path is set
    if (!currentFilePathRef.current) {
      return false
    }

    // Don't autosave if document hasn't changed since last autosave
    const currentDocJson = JSON.stringify(doc)
    if (!force && currentDocJson === lastAutosaveDocRef.current) {
      return false
    }

    // Don't autosave if already autosaving
    if (isAutosavingRef.current) {
      return false
    }

    isAutosavingRef.current = true

    try {
      console.log('Autosaving document...')
      const result: AutosaveInfo = await autosaveDocument(doc, currentFilePathRef.current!)
      lastAutosaveDocRef.current = currentDocJson

      console.log('Autosave completed:', result)

      // Dispatch event for UI to show autosave indicator
      window.dispatchEvent(new CustomEvent('autosave-completed', {
        detail: {
          timestamp: result.timestamp,
          recoveryPath: result.recovery_path
        }
      }))

      return true
    } catch (error) {
      console.error('Autosave failed:', error)

      // Dispatch event for UI to show autosave error
      window.dispatchEvent(new CustomEvent('autosave-failed', {
        detail: { error: error instanceof Error ? error.message : 'Unknown error' }
      }))

      return false
    } finally {
      isAutosavingRef.current = false
    }
  }, [doc])

  // Function to reset idle timer (call this on user activity)
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }

    // Set new idle timer
    idleTimerRef.current = setTimeout(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity >= idleDelay) {
        // User has been idle, trigger autosave
        performAutosave()
      }
    }, idleDelay)
  }, [idleDelay, performAutosave])

  // Set up periodic autosave timer
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current
      if (timeSinceActivity >= idleDelay) {
        // User has been idle or it's just time for periodic autosave
        performAutosave()
      }
    }, interval)

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
    }
  }, [interval, idleDelay, performAutosave])

  // Set up idle detection
  useEffect(() => {
    const handleUserActivity = () => {
      resetIdleTimer()
    }

    const events = [
      'mousedown', 'mousemove', 'keypress',
      'scroll', 'touchstart', 'click'
    ]

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })

    // Initialize idle timer
    resetIdleTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [resetIdleTimer])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [])

  // Function to check for recovery files on startup
  const checkForRecoveryFiles = useCallback(async (): Promise<AutosaveInfo[]> => {
    try {
      const recoveryFiles: AutosaveInfo[] = await checkRecoveryFiles()
      return recoveryFiles
    } catch (error) {
      console.error('Failed to check recovery files:', error)
      return []
    }
  }, [])

  // Function to get current autosave status
  const getAutosaveInfo = useCallback(async (): Promise<AutosaveInfo | null> => {
    try {
      const info: AutosaveInfo | null = await getAutosaveStatus()
      return info
    } catch (error) {
      console.error('Failed to get autosave status:', error)
      return null
    }
  }, [])

  // Function to force autosave immediately
  const forceAutosave = useCallback(() => {
    performAutosave(true)
  }, [performAutosave])

  return {
    checkForRecoveryFiles,
    getAutosaveInfo,
    forceAutosave,
    resetIdleTimer
  }
}