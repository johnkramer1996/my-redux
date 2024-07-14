// src/listenerMiddleware/index.ts
import { isAction as isAction3 } from 'redux'

// src/listenerMiddleware/exceptions.ts
var task = 'task'
var listener = 'listener'
var completed = 'completed'
var cancelled = 'cancelled'
var taskCancelled = `task-${cancelled}`
var taskCompleted = `task-${completed}`
var listenerCancelled = `${listener}-${cancelled}`
var listenerCompleted = `${listener}-${completed}`
var TaskAbortError = class {
  constructor(code) {
    this.code = code
    this.message = `${task} ${cancelled} (reason: ${code})`
  }
  name = 'TaskAbortError'
  message
}

// src/listenerMiddleware/utils.ts
var noop2 = () => {}
var catchRejection = (promise, onError = noop2) => {
  promise.catch(onError)
  return promise
}
var addAbortSignalListener = (abortSignal, callback) => {
  abortSignal.addEventListener('abort', callback, {
    once: true,
  })
  return () => abortSignal.removeEventListener('abort', callback)
}
var abortControllerWithReason = (abortController, reason) => {
  const signal = abortController.signal
  if (signal.aborted) {
    return
  }
  if (!('reason' in signal)) {
    Object.defineProperty(signal, 'reason', {
      enumerable: true,
      value: reason,
      configurable: true,
      writable: true,
    })
  }
  abortController.abort(reason)
}

// src/listenerMiddleware/task.ts
var validateActive = (signal) => {
  if (signal.aborted) {
    const { reason } = signal
    throw new TaskAbortError(reason)
  }
}
function raceWithSignal(signal, promise) {
  let cleanup = noop2
  return new Promise((resolve, reject) => {
    const notifyRejection = () => reject(new TaskAbortError(signal.reason))
    if (signal.aborted) {
      notifyRejection()
      return
    }
    cleanup = addAbortSignalListener(signal, notifyRejection)
    promise.finally(() => cleanup()).then(resolve, reject)
  }).finally(() => {
    cleanup = noop2
  })
}
var runTask = async (task2, cleanUp) => {
  try {
    await Promise.resolve()
    const value = await task2()
    return {
      status: 'ok',
      value,
    }
  } catch (error) {
    return {
      status: error instanceof TaskAbortError ? 'cancelled' : 'rejected',
      error,
    }
  } finally {
    cleanUp?.()
  }
}
var createPause = (signal) => {
  return (promise) => {
    return catchRejection(
      raceWithSignal(signal, promise).then((output) => {
        validateActive(signal)
        return output
      }),
    )
  }
}
var createDelay = (signal) => {
  const pause = createPause(signal)
  return (timeoutMs) => {
    return pause(new Promise((resolve) => setTimeout(resolve, timeoutMs)))
  }
}

// src/listenerMiddleware/index.ts
var { assign } = Object
var INTERNAL_NIL_TOKEN = {}
var alm = 'listenerMiddleware'
var createFork = (parentAbortSignal, parentBlockingPromises) => {
  const linkControllers = (controller) =>
    addAbortSignalListener(parentAbortSignal, () => abortControllerWithReason(controller, parentAbortSignal.reason))
  return (taskExecutor, opts) => {
    const childAbortController = new AbortController()
    linkControllers(childAbortController)
    const result = runTask(
      async () => {
        validateActive(parentAbortSignal)
        validateActive(childAbortController.signal)
        const result2 = await taskExecutor({
          pause: createPause(childAbortController.signal),
          delay: createDelay(childAbortController.signal),
          signal: childAbortController.signal,
        })
        validateActive(childAbortController.signal)
        return result2
      },
      () => abortControllerWithReason(childAbortController, taskCompleted),
    )
    if (opts?.autoJoin) {
      parentBlockingPromises.push(result.catch(noop2))
    }
    return {
      result: createPause(parentAbortSignal)(result),
      cancel() {
        abortControllerWithReason(childAbortController, taskCancelled)
      },
    }
  }
}
var createTakePattern = (startListening, signal) => {
  const take = async (predicate, timeout) => {
    validateActive(signal)
    let unsubscribe = () => {}
    const tuplePromise = new Promise((resolve, reject) => {
      let stopListening = startListening({
        predicate,
        effect: (action, listenerApi) => {
          listenerApi.unsubscribe()
          resolve([action, listenerApi.getState(), listenerApi.getOriginalState()])
        },
      })
      unsubscribe = () => {
        stopListening()
        reject()
      }
    })
    const promises = [tuplePromise]
    if (timeout != null) {
      promises.push(new Promise((resolve) => setTimeout(resolve, timeout, null)))
    }
    try {
      const output = await raceWithSignal(signal, Promise.race(promises))
      validateActive(signal)
      return output
    } finally {
      unsubscribe()
    }
  }
  return (predicate, timeout) => catchRejection(take(predicate, timeout))
}
var getListenerEntryPropsFrom = (options) => {
  let { type, actionCreator, matcher, predicate, effect } = options
  if (type) {
    predicate = createAction(type).match
  } else if (actionCreator) {
    type = actionCreator.type
    predicate = actionCreator.match
  } else if (matcher) {
    predicate = matcher
  } else if (predicate) {
  } else {
    throw new Error(
      process.env.NODE_ENV === 'production'
        ? formatProdErrorMessage(21)
        : 'Creating or removing a listener requires one of the known fields for matching an action',
    )
  }
  return {
    predicate,
    type,
    effect,
  }
}
var createListenerEntry = Object.assign(
  (options) => {
    const { type, predicate, effect } = getListenerEntryPropsFrom(options)
    const id = nanoid()
    const entry = {
      id,
      effect,
      type,
      predicate,
      pending: /* @__PURE__ */ new Set(),
      unsubscribe: () => {
        throw new Error(
          process.env.NODE_ENV === 'production' ? formatProdErrorMessage(22) : 'Unsubscribe not initialized',
        )
      },
    }
    return entry
  },
  {
    withTypes: () => createListenerEntry,
  },
)
var cancelActiveListeners = (entry) => {
  entry.pending.forEach((controller) => {
    abortControllerWithReason(controller, listenerCancelled)
  })
}
var createClearListenerMiddleware = (listenerMap) => {
  return () => {
    listenerMap.forEach(cancelActiveListeners)
    listenerMap.clear()
  }
}
var safelyNotifyError = (errorHandler, errorToNotify, errorInfo) => {
  try {
    errorHandler(errorToNotify, errorInfo)
  } catch (errorHandlerError) {
    setTimeout(() => {
      throw errorHandlerError
    }, 0)
  }
}
var addListener = Object.assign(createAction(`${alm}/add`), {
  withTypes: () => addListener,
})
var clearAllListeners = createAction(`${alm}/removeAll`)
var removeListener = Object.assign(createAction(`${alm}/remove`), {
  withTypes: () => removeListener,
})
var defaultErrorHandler = (...args) => {
  console.error(`${alm}/error`, ...args)
}
var createListenerMiddleware = (middlewareOptions = {}) => {
  const listenerMap = /* @__PURE__ */ new Map()
  const { extra, onError = defaultErrorHandler } = middlewareOptions
  const insertEntry = (entry) => {
    entry.unsubscribe = () => listenerMap.delete(entry.id)
    listenerMap.set(entry.id, entry)
    return (cancelOptions) => {
      entry.unsubscribe()
      if (cancelOptions?.cancelActive) {
        cancelActiveListeners(entry)
      }
    }
  }
  const startListening = (options) => {
    let entry = find(Array.from(listenerMap.values()), (existingEntry) => existingEntry.effect === options.effect)
    if (!entry) {
      entry = createListenerEntry(options)
    }
    return insertEntry(entry)
  }
  Object.assign(startListening, {
    withTypes: () => startListening,
  })
  const stopListening = (options) => {
    const { type, effect, predicate } = getListenerEntryPropsFrom(options)
    const entry = find(Array.from(listenerMap.values()), (entry2) => {
      const matchPredicateOrType = typeof type === 'string' ? entry2.type === type : entry2.predicate === predicate
      return matchPredicateOrType && entry2.effect === effect
    })
    if (entry) {
      entry.unsubscribe()
      if (options.cancelActive) {
        cancelActiveListeners(entry)
      }
    }
    return !!entry
  }
  Object.assign(stopListening, {
    withTypes: () => stopListening,
  })
  const notifyListener = async (entry, action, api, getOriginalState) => {
    const internalTaskController = new AbortController()
    const take = createTakePattern(startListening, internalTaskController.signal)
    const autoJoinPromises = []
    try {
      entry.pending.add(internalTaskController)
      await Promise.resolve(
        entry.effect(
          action,
          // Use assign() rather than ... to avoid extra helper functions added to bundle
          assign({}, api, {
            getOriginalState,
            condition: (predicate, timeout) => take(predicate, timeout).then(Boolean),
            take,
            delay: createDelay(internalTaskController.signal),
            pause: createPause(internalTaskController.signal),
            extra,
            signal: internalTaskController.signal,
            fork: createFork(internalTaskController.signal, autoJoinPromises),
            unsubscribe: entry.unsubscribe,
            subscribe: () => {
              listenerMap.set(entry.id, entry)
            },
            cancelActiveListeners: () => {
              entry.pending.forEach((controller, _, set) => {
                if (controller !== internalTaskController) {
                  abortControllerWithReason(controller, listenerCancelled)
                  set.delete(controller)
                }
              })
            },
            cancel: () => {
              abortControllerWithReason(internalTaskController, listenerCancelled)
              entry.pending.delete(internalTaskController)
            },
            throwIfCancelled: () => {
              validateActive(internalTaskController.signal)
            },
          }),
        ),
      )
    } catch (listenerError) {
      if (!(listenerError instanceof TaskAbortError)) {
        safelyNotifyError(onError, listenerError, {
          raisedBy: 'effect',
        })
      }
    } finally {
      await Promise.all(autoJoinPromises)
      abortControllerWithReason(internalTaskController, listenerCompleted)
      entry.pending.delete(internalTaskController)
    }
  }
  const clearListenerMiddleware = createClearListenerMiddleware(listenerMap)
  const middleware = (api) => (next) => (action) => {
    if (!isAction3(action)) {
      return next(action)
    }
    if (addListener.match(action)) {
      return startListening(action.payload)
    }
    if (clearAllListeners.match(action)) {
      clearListenerMiddleware()
      return
    }
    if (removeListener.match(action)) {
      return stopListening(action.payload)
    }
    let originalState = api.getState()
    const getOriginalState = () => {
      return originalState
    }
    let result
    try {
      result = next(action)
      if (listenerMap.size > 0) {
        const currentState = api.getState()
        const listenerEntries = Array.from(listenerMap.values())
        for (const entry of listenerEntries) {
          let runListener = false
          try {
            runListener = entry.predicate(action, currentState, originalState)
          } catch (predicateError) {
            runListener = false
            safelyNotifyError(onError, predicateError, {
              raisedBy: 'predicate',
            })
          }
          if (!runListener) {
            continue
          }
          notifyListener(entry, action, api, getOriginalState)
        }
      }
    } finally {
      originalState = INTERNAL_NIL_TOKEN
    }
    return result
  }
  return {
    middleware,
    startListening,
    stopListening,
    clearListeners: clearListenerMiddleware,
  }
}

export { TaskAbortError, addListener, clearAllListeners, removeListener, createListenerMiddleware }
