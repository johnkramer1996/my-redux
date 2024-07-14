import React from 'react'
import { ReactReduxContext } from './hooks'

// src/utils/Subscription.ts
function createListenerCollection() {
  let first: any = null
  let last: any = null
  return {
    notify() {
      let listener = first
      while (listener) {
        listener.callback()
        listener = listener.next
      }
    },
    subscribe(callback: Function) {
      let isSubscribed = true
      const listener = (last = {
        callback,
        // @ts-ignore
        next: null,
        prev: last,
      })
      if (listener.prev) {
        listener.prev.next = listener
      } else {
        first = listener
      }
      return function unsubscribe() {
        if (!isSubscribed || first === null) return
        isSubscribed = false
        if (listener.next) {
          // @ts-ignore
          listener.next.prev = listener.prev
        } else {
          last = listener.prev
        }
        if (listener.prev) {
          listener.prev.next = listener.next
        } else {
          first = listener.next
        }
      }
    },
  }
}
function createSubscription(store: any) {
  const listeners = createListenerCollection()
  const unsubscribe = store.subscribe(listeners.notify)
  return { subscribe: listeners.subscribe }
}

// src/components/Provider.tsx
// @ts-ignore
export function Provider({ store, children }) {
  const contextValue = React.useMemo(() => {
    const subscription = createSubscription(store)
    return { store, subscription }
  }, [store])
  // @ts-ignore
  return /* @__PURE__ */ React.createElement(ReactReduxContext.Provider, { value: contextValue }, children)
}
