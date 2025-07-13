import { useState, useEffect } from 'react'

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
 */
export const usePageVisibilityCallback = (callback: () => void, dependencies: any[] = []) => {
  const isVisible = usePageVisibility()
  const [wasVisible, setWasVisible] = useState(isVisible)

  useEffect(() => {
    // Only trigger callback when page becomes visible (not when it becomes hidden)
    if (isVisible && !wasVisible) {
      console.log('🔄 Page became visible, triggering callback...')
      callback()
    }
    setWasVisible(isVisible)
  }, [isVisible, callback, ...dependencies])

  return isVisible
}