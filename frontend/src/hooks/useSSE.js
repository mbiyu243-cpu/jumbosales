import { useState, useEffect, useCallback } from 'react'

/**
 * useSSE - Custom hook for Server-Sent Events (SSE) connection
 * Used for real-time bid updates in auction sessions
 *
 * @param {string} url - SSE endpoint URL
 * @param {object} options - Configuration options
 * @returns {object} - { data, error, connected, reconnect }
 */
export function useSSE(url, options = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [connected, setConnected] = useState(false)

  const { onMessage, onError, enabled = true } = options

  const connect = useCallback(() => {
    if (!url || !enabled) return null

    const token = localStorage.getItem('token')
    const fullUrl = `${url}${url.includes('?') ? '&' : '?'}token=${token}`

    const eventSource = new EventSource(fullUrl)

    eventSource.onopen = () => {
      setConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        setData(parsed)
        onMessage?.(parsed)
      } catch (e) {
        console.error('SSE parse error:', e)
      }
    }

    eventSource.onerror = (err) => {
      setConnected(false)
      setError(err)
      onError?.(err)
      eventSource.close()
    }

    return eventSource
  }, [url, enabled, onMessage, onError])

  useEffect(() => {
    const eventSource = connect()

    return () => {
      eventSource?.close()
    }
  }, [connect])

  const reconnect = useCallback(() => {
    connect()
  }, [connect])

  return { data, error, connected, reconnect }
}

export default useSSE
