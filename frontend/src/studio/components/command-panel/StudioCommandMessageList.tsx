import { memo, useCallback, type RefObject } from 'react'
import { useCommandStoreSelector } from './use-command-store-selector'
import { selectVisibleMessageIds } from './selectors'
import type { StudioCommandPanelStore } from './store'
import { StudioCommandMessageRow } from './StudioCommandMessageRow'

interface StudioCommandMessageListProps {
  store: StudioCommandPanelStore
  endRef: RefObject<HTMLDivElement | null>
}

export const StudioCommandMessageList = memo(function StudioCommandMessageList({
  store,
  endRef,
}: StudioCommandMessageListProps) {
  const selectIds = useCallback(
    (snapshot: ReturnType<StudioCommandPanelStore['getSnapshot']>) => selectVisibleMessageIds(snapshot),
    [],
  )
  const visibleMessageIds = useCommandStoreSelector(store, selectIds, areIdListsEqual)

  return (
    <div className="flex flex-col space-y-12">
      {visibleMessageIds.map((messageId) => (
        <StudioCommandMessageRow
          key={messageId}
          messageId={messageId}
          store={store}
        />
      ))}

      <div ref={endRef} />
    </div>
  )
})

function areIdListsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}
