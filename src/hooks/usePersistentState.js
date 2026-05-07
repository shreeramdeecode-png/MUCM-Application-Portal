import { useEffect, useLayoutEffect, useRef, useState } from 'react'

function readStored(key, initialValue) {
  const storedValue = window.localStorage.getItem(key)
  if (!storedValue) {
    return initialValue
  }
  try {
    return JSON.parse(storedValue)
  } catch {
    return initialValue
  }
}

/**
 * Like useState but persists to localStorage. When `key` changes (e.g. different logged-in user),
 * state reloads from storage for that key so drafts do not leak between accounts on one browser.
 */
export function usePersistentState(key, initialValue) {
  const keyRef = useRef(key)

  const [state, setState] = useState(() => readStored(key, initialValue))

  useLayoutEffect(() => {
    if (keyRef.current === key) {
      return
    }
    keyRef.current = key
    setState(readStored(key, initialValue))
  }, [key])

  useEffect(() => {
    window.localStorage.setItem(keyRef.current, JSON.stringify(state))
  }, [state])

  return [state, setState]
}
