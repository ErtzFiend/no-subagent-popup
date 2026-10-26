import { useEffect, useSyncExternalStore } from 'react'

import { registry } from '@/contrib/registry'
import { startChildLinkHistory } from './no-subagent-popup-history-runtime'

/** Explicit companion-plugin seam added by this patch, NOT an upstream SDK API. */
export const NO_SUBAGENT_POPUP_AREA = 'session.noSubagentPopup'
const subscribe = (listener: () => void) => registry.subscribeArea(NO_SUBAGENT_POPUP_AREA, listener)
export const noSubagentPopupEnabled = () => registry.getArea(NO_SUBAGENT_POPUP_AREA).some(c => (c.data as { enabled?: boolean } | undefined)?.enabled === true)
export const useNoSubagentPopup = () => {
  const enabled = useSyncExternalStore(subscribe, noSubagentPopupEnabled, () => false)
  useEffect(() => enabled ? startChildLinkHistory() : undefined, [enabled])
  return enabled
}
