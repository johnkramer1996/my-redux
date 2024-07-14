// src/combineSlices.ts
import { combineReducers as combineReducers2 } from 'redux'
var isSliceLike = (maybeSliceLike) => 'reducerPath' in maybeSliceLike && typeof maybeSliceLike.reducerPath === 'string'
var getReducers = (slices) =>
  slices.flatMap((sliceOrMap) =>
    isSliceLike(sliceOrMap) ? [[sliceOrMap.reducerPath, sliceOrMap.reducer]] : Object.entries(sliceOrMap),
  )
var ORIGINAL_STATE = Symbol.for('rtk-state-proxy-original')
var isStateProxy = (value) => !!value && !!value[ORIGINAL_STATE]
var stateProxyMap = /* @__PURE__ */ new WeakMap()
var createStateProxy = (state, reducerMap) =>
  emplace(stateProxyMap, state, {
    insert: () =>
      new Proxy(state, {
        get: (target, prop, receiver) => {
          if (prop === ORIGINAL_STATE) return target
          const result = Reflect.get(target, prop, receiver)
          if (typeof result === 'undefined') {
            const reducer = reducerMap[prop.toString()]
            if (reducer) {
              const reducerResult = reducer(void 0, {
                type: nanoid(),
              })

              return reducerResult
            }
          }
          return result
        },
      }),
  })
var original = (state) => {
  return state[ORIGINAL_STATE]
}
var noopReducer = (state = {}) => state
function combineSlices(...slices) {
  const reducerMap = Object.fromEntries(getReducers(slices))
  const getReducer = () => (Object.keys(reducerMap).length ? combineReducers2(reducerMap) : noopReducer)
  let reducer = getReducer()
  function combinedReducer(state, action) {
    return reducer(state, action)
  }
  combinedReducer.withLazyLoadedSlices = () => combinedReducer
  const inject = (slice, config = {}) => {
    const { reducerPath, reducer: reducerToInject } = slice
    const currentReducer = reducerMap[reducerPath]
    if (!config.overrideExisting && currentReducer && currentReducer !== reducerToInject) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.error(
          `called \`inject\` to override already-existing reducer ${reducerPath} without specifying \`overrideExisting: true\``,
        )
      }
      return combinedReducer
    }
    reducerMap[reducerPath] = reducerToInject
    reducer = getReducer()
    return combinedReducer
  }
  const selector = Object.assign(
    function makeSelector(selectorFn, selectState) {
      return function selector2(state, ...args) {
        return selectorFn(createStateProxy(selectState ? selectState(state, ...args) : state, reducerMap), ...args)
      }
    },
    {
      original,
    },
  )
  return Object.assign(combinedReducer, {
    inject,
    selector,
  })
}

export { combineSlices }
