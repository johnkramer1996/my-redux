// src/configureStore.ts
import { applyMiddleware, createStore, combineReducers, isPlainObject as isPlainObject2 } from 'redux'
// src/getDefaultMiddleware.ts
import { thunk as thunkMiddleware } from 'redux-thunk'

// src/devtoolsExtension.ts
import { compose } from 'redux'
var composeWithDevTools =
  typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
    : function () {
        if (arguments.length === 0) return void 0
        if (typeof arguments[0] === 'object') return compose
        return compose.apply(null, arguments)
      }

var Tuple = class _Tuple extends Array {
  constructor(...items) {
    super(...items)
    Object.setPrototypeOf(this, _Tuple.prototype)
  }
  static get [Symbol.species]() {
    return _Tuple
  }
  concat(...arr) {
    return super.concat.apply(this, arr)
  }
  prepend(...arr) {
    if (arr.length === 1 && Array.isArray(arr[0])) {
      return new _Tuple(...arr[0].concat(this))
    }
    return new _Tuple(...arr.concat(this))
  }
}

// src/getDefaultEnhancers.ts
var buildGetDefaultEnhancers = (middlewareEnhancer) =>
  function getDefaultEnhancers() {
    return new Tuple(middlewareEnhancer)
  }

// src/getDefaultMiddleware.ts
var buildGetDefaultMiddleware = () =>
  function getDefaultMiddleware() {
    let middlewareArray = new Tuple()
    middlewareArray.push(thunkMiddleware)
    return middlewareArray
  }

// src/configureStore.ts
function configureStore(options) {
  const getDefaultMiddleware = buildGetDefaultMiddleware()
  const { reducer = void 0, middleware, preloadedState = void 0, enhancers = void 0 } = options || {}
  const rootReducer =
    typeof reducer === 'function' ? reducer : isPlainObject2(reducer) ? combineReducers(reducer) : undefined

  const finalMiddleware = typeof middleware === 'function' ? middleware(getDefaultMiddleware) : getDefaultMiddleware()
  const finalCompose = composeWithDevTools({})
  const middlewareEnhancer = applyMiddleware(...finalMiddleware)
  const getDefaultEnhancers = buildGetDefaultEnhancers(middlewareEnhancer)
  let storeEnhancers = typeof enhancers === 'function' ? enhancers(getDefaultEnhancers) : getDefaultEnhancers()
  const composedEnhancer = finalCompose(...storeEnhancers)
  return createStore(rootReducer, preloadedState, composedEnhancer)
}

export { configureStore }
