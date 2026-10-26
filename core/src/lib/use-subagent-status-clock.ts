import { useSyncExternalStore } from 'react'

let now = Math.floor(Date.now() / 1000)
let timer: ReturnType<typeof setInterval> | undefined
const listeners = new Set<() => void>()
const snapshot = () => now
const serverSnapshot = () => 0
const idleSubscribe = () => () => {}
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!timer) {
    now = Math.floor(Date.now() / 1000)
    timer = setInterval(() => {
      const next = Math.floor(Date.now() / 1000)
      if (next === now) return
      now = next
      for (const notify of listeners) notify()
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size && timer) { clearInterval(timer); timer = undefined }
  }
}
/** One shared clock for all visible live children; no timers for settled cards. */
export const useSubagentStatusClock = (active: boolean) =>
  useSyncExternalStore(active ? subscribe : idleSubscribe, snapshot, serverSnapshot)
