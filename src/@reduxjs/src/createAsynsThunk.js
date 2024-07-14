// src/createAsyncThunk.ts
var commonProperties = ['name', 'message', 'stack', 'code']
var RejectWithValue = class {
  constructor(payload, meta) {
    this.payload = payload
    this.meta = meta
  }
  /*
  type-only property to distinguish between RejectWithValue and FulfillWithMeta
  does not exist at runtime
  */
  _type
}
var FulfillWithMeta = class {
  constructor(payload, meta) {
    this.payload = payload
    this.meta = meta
  }
  /*
  type-only property to distinguish between RejectWithValue and FulfillWithMeta
  does not exist at runtime
  */
  _type
}
var miniSerializeError = (value) => {
  if (typeof value === 'object' && value !== null) {
    const simpleError = {}
    for (const property of commonProperties) {
      if (typeof value[property] === 'string') {
        simpleError[property] = value[property]
      }
    }
    return simpleError
  }
  return {
    message: String(value),
  }
}
var createAsyncThunk = /* @__PURE__ */ (() => {
  function createAsyncThunk2(typePrefix, payloadCreator, options) {
    const fulfilled = createAction(typePrefix + '/fulfilled', (payload, requestId, arg, meta) => ({
      payload,
      meta: {
        ...(meta || {}),
        arg,
        requestId,
        requestStatus: 'fulfilled',
      },
    }))
    const pending = createAction(typePrefix + '/pending', (requestId, arg, meta) => ({
      payload: void 0,
      meta: {
        ...(meta || {}),
        arg,
        requestId,
        requestStatus: 'pending',
      },
    }))
    const rejected = createAction(typePrefix + '/rejected', (error, requestId, arg, payload, meta) => ({
      payload,
      error: ((options && options.serializeError) || miniSerializeError)(error || 'Rejected'),
      meta: {
        ...(meta || {}),
        arg,
        requestId,
        rejectedWithValue: !!payload,
        requestStatus: 'rejected',
        aborted: error?.name === 'AbortError',
        condition: error?.name === 'ConditionError',
      },
    }))
    function actionCreator(arg) {
      return (dispatch, getState, extra) => {
        const requestId = options?.idGenerator ? options.idGenerator(arg) : nanoid()
        const abortController = new AbortController()
        let abortHandler
        let abortReason
        function abort(reason) {
          abortReason = reason
          abortController.abort()
        }
        const promise = (async function () {
          let finalAction
          try {
            let conditionResult = options?.condition?.(arg, {
              getState,
              extra,
            })
            if (isThenable(conditionResult)) {
              conditionResult = await conditionResult
            }
            if (conditionResult === false || abortController.signal.aborted) {
              throw {
                name: 'ConditionError',
                message: 'Aborted due to condition callback returning false.',
              }
            }
            const abortedPromise = new Promise((_, reject) => {
              abortHandler = () => {
                reject({
                  name: 'AbortError',
                  message: abortReason || 'Aborted',
                })
              }
              abortController.signal.addEventListener('abort', abortHandler)
            })
            dispatch(
              pending(
                requestId,
                arg,
                options?.getPendingMeta?.(
                  {
                    requestId,
                    arg,
                  },
                  {
                    getState,
                    extra,
                  },
                ),
              ),
            )
            finalAction = await Promise.race([
              abortedPromise,
              Promise.resolve(
                payloadCreator(arg, {
                  dispatch,
                  getState,
                  extra,
                  requestId,
                  signal: abortController.signal,
                  abort,
                  rejectWithValue: (value, meta) => {
                    return new RejectWithValue(value, meta)
                  },
                  fulfillWithValue: (value, meta) => {
                    return new FulfillWithMeta(value, meta)
                  },
                }),
              ).then((result) => {
                if (result instanceof RejectWithValue) {
                  throw result
                }
                if (result instanceof FulfillWithMeta) {
                  return fulfilled(result.payload, requestId, arg, result.meta)
                }
                return fulfilled(result, requestId, arg)
              }),
            ])
          } catch (err) {
            finalAction =
              err instanceof RejectWithValue
                ? rejected(null, requestId, arg, err.payload, err.meta)
                : rejected(err, requestId, arg)
          } finally {
            if (abortHandler) {
              abortController.signal.removeEventListener('abort', abortHandler)
            }
          }
          const skipDispatch =
            options && !options.dispatchConditionRejection && rejected.match(finalAction) && finalAction.meta.condition
          if (!skipDispatch) {
            dispatch(finalAction)
          }
          return finalAction
        })()
        return Object.assign(promise, {
          abort,
          requestId,
          arg,
          unwrap() {
            return promise.then(unwrapResult)
          },
        })
      }
    }
    return Object.assign(actionCreator, {
      pending,
      rejected,
      fulfilled,
      settled: isAnyOf(rejected, fulfilled),
      typePrefix,
    })
  }
  createAsyncThunk2.withTypes = () => createAsyncThunk2
  return createAsyncThunk2
})()
function unwrapResult(action) {
  if (action.meta && action.meta.rejectedWithValue) {
    throw action.payload
  }
  if (action.error) {
    throw action.error
  }
  return action.payload
}
function isThenable(value) {
  return value !== null && typeof value === 'object' && typeof value.then === 'function'
}
