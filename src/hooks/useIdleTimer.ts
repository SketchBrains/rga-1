import { useEffect, useRef, useCallback } from 'react'

interface UseIdleTimerOptions {
  timeout: number // in milliseconds
  onIdle: () => void
  events?: string[]
}

/**
 * Custom hook to track user idle time and trigger callback after timeout
 * @param timeout - Time in milliseconds before considering user idle
 * @param onIdle - Callback function to execute when user becomes idle
 * @param events - Array of events to listen for user activity (optional)
 */
export const useIdleTimer = ({ timeout, onIdle, events }: UseIdleTimerOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onIdleRef = useRef(onIdle)

  // Update the callback ref when onIdle changes
  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  // Default events to listen for user activity
  const defaultEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'keydown',
    'scroll',
    'touchstart',
    'click',
    'wheel',
    'focus',
    'blur'
  ]

  const eventsToListen = events || defaultEvents

  // Reset the idle timer
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      console.log('🕐 User has been idle for', timeout / 1000 / 60, 'minutes, triggering idle callback')
      onIdleRef.current()
    }, timeout)
  }, [timeout])

  // Handle user activity
  const handleActivity = useCallback(() => {
    console.log('👆 User activity detected, resetting idle timer')
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    // Start the timer initially
    resetTimer()

    // Add event listeners for user activity
    eventsToListen.forEach(event => {
      window.addEventListener(event, handleActivity, true)
    })

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      eventsToListen.forEach(event => {
        window.removeEventListener(event, handleActivity, true)
      })
    }
  }, [handleActivity, resetTimer, eventsToListen])

  // Return a function to manually reset the timer if needed
  return { resetTimer }
}

/**
 * Hook specifically for auto-logout functionality
 * @param timeoutMinutes - Time in minutes before auto-logout
 * @param onLogout - Function to call when auto-logout should occur
 */
export const useAutoLogout = (timeoutMinutes: number, onLogout: () => void) => {
  const timeoutMs = timeoutMinutes * 60 * 1000

  return useIdleTimer({
    timeout: timeoutMs,
    onIdle: () => {
      console.log('🚪 Auto-logout triggered after', timeoutMinutes, 'minutes of inactivity')
      onLogout()
    }
  })
}