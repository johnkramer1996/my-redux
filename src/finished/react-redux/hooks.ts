import React from 'react'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/with-selector.js'

// src/hooks/useSelector.ts
export var useSelector = (selector: any, equalityFnOrOptions = {}) => {
  // @ts-ignore
  const { equalityFn = (a, b) => a === b } =
    typeof equalityFnOrOptions === 'function' ? { equalityFn: equalityFnOrOptions } : equalityFnOrOptions
  // @ts-ignore
  const { store, subscription } = useReduxContext()

  const wrappedSelector = React.useCallback(selector, [selector])

  return useSyncExternalStoreWithSelector(
    subscription.subscribe,
    store.getState,
    store.getState,
    wrappedSelector,
    equalityFn,
  )
}
// @ts-ignore
useSelector.withTypes = () => useSelector

// src/hooks/useStore.ts
export var useStore = () => {
  // @ts-ignore
  const { store } = useReduxContext()
  return store
}
export var useDispatch = () => {
  const store = useStore()

  return store.dispatch
}
// @ts-ignore
useDispatch.withTypes = () => useDispatch

// src/components/Context.ts
export var ReactReduxContext = React.createContext(null)
// src/hooks/useReduxContext.ts
export var useReduxContext = function useReduxContext2() {
  return React.useContext(ReactReduxContext)
}

const objectIs = (obj1: any, obj2: any) => obj1 === obj2

export function useSyncExternalStoreWithSelector1<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: any,
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  var instRef = useRef({
    hasValue: false,
    value: null,
  })

  var getSelection = useMemo(() => {
    var hasMemo = false
    var memoizedSnapshot: any
    var memoizedSelection: any

    var memoizedSelector = function (nextSnapshot: any) {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot

        var nextSelection = selector(nextSnapshot)

        if (isEqual !== undefined) {
          if (instRef.current.hasValue) {
            var currentSelection = instRef.current.value
            // @ts-ignore
            if (isEqual(currentSelection, nextSelection)) return (memoizedSelection = currentSelection)
          }
        }

        memoizedSelection = nextSelection
        return nextSelection
      } // We may be able to reuse the previous invocation's result.

      // We may be able to reuse the previous invocation's result.
      var prevSnapshot = memoizedSnapshot
      var prevSelection = memoizedSelection

      if (objectIs(prevSnapshot, nextSnapshot)) return prevSelection
      var nextSelection = selector(nextSnapshot) // If a custom isEqual function is provided, use that to check if the data
      if (isEqual !== undefined && isEqual(prevSelection, nextSelection)) return prevSelection

      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }

    return function () {
      return memoizedSelector(getSnapshot())
    }
  }, [getSnapshot, selector, isEqual])

  var value = useSyncExternalStore(subscribe, getSelection)
  useEffect(() => {
    instRef.current.hasValue = true
    instRef.current.value = value
  }, [value])
  return value
}
