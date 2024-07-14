// src/dynamicMiddleware/index.ts
import { compose as compose3 } from 'redux'
var createMiddlewareEntry = (middleware) => ({
  id: nanoid(),
  middleware,
  applied: /* @__PURE__ */ new Map(),
})
var matchInstance = (instanceId) => (action) => action?.meta?.instanceId === instanceId
var createDynamicMiddleware = () => {
  const instanceId = nanoid()
  const middlewareMap = /* @__PURE__ */ new Map()
  const withMiddleware = Object.assign(
    createAction('dynamicMiddleware/add', (...middlewares) => ({
      payload: middlewares,
      meta: {
        instanceId,
      },
    })),
    {
      withTypes: () => withMiddleware,
    },
  )
  const addMiddleware = Object.assign(
    function addMiddleware2(...middlewares) {
      middlewares.forEach((middleware2) => {
        let entry = find(Array.from(middlewareMap.values()), (entry2) => entry2.middleware === middleware2)
        if (!entry) {
          entry = createMiddlewareEntry(middleware2)
        }
        middlewareMap.set(entry.id, entry)
      })
    },
    {
      withTypes: () => addMiddleware,
    },
  )
  const getFinalMiddleware = (api) => {
    const appliedMiddleware = Array.from(middlewareMap.values()).map((entry) =>
      emplace(entry.applied, api, {
        insert: () => entry.middleware(api),
      }),
    )
    return compose3(...appliedMiddleware)
  }
  const isWithMiddleware = isAllOf(withMiddleware, matchInstance(instanceId))
  const middleware = (api) => (next) => (action) => {
    if (isWithMiddleware(action)) {
      addMiddleware(...action.payload)
      return api.dispatch
    }
    return getFinalMiddleware(api)(next)(action)
  }
  return {
    middleware,
    addMiddleware,
    withMiddleware,
    instanceId,
  }
}

export { createDynamicMiddleware }
