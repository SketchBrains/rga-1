import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook to track page visibility state
 * Returns true when the page is visible, false when hidden
 */
export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden)
    }

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup event listener on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isVisible
}

/**
 * Custom hook that triggers a callback when the page becomes visible
 * Useful for refreshing data or sessions when user returns to the tab
 * Enhanced with debouncing and error handling for session management
 */
export const usePageVisibilityCallback = (callback: () => Promise<void> | void, dependencies: any[] = []) => {
  const isVisible = usePageVisibility()
  const [wasVisible, setWasVisible] = useState(isVisible)
  const [isProcessing, setIsProcessing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only trigger callback when page becomes visible (not when it becomes hidden)
    // and we're not already processing
    if (isVisible && !wasVisible && !isProcessing) {
      console.log('🔄 Page became visible, triggering callback...')
      
      // Debounce the callback to prevent rapid successive calls
      timeoutRef.current = setTimeout(async () => {
        if (isProcessing) return
        
        setIsProcessing(true)
        try {
          await callback()
        } catch (error) {
          console.error('❌ Error in page visibility callback:', error)
        } finally {
          setIsProcessing(false)
        }
      }, 500) // 500ms debounce
    }
    setWasVisible(isVisible)
    
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible, wasVisible, isProcessing, callback, ...dependencies])

  return isVisible
}