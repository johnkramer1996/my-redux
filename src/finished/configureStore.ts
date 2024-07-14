import type { Reducer, ReducersMapObject, Middleware, Action, StoreEnhancer, Store, UnknownAction } from 'redux'
import { applyMiddleware, createStore, compose, combineReducers, isPlainObject } from 'redux'
import type { DevToolsEnhancerOptions as DevToolsOptions } from './devtoolsExtension'
import { composeWithDevTools } from './devtoolsExtension'

import type { ThunkMiddlewareFor, GetDefaultMiddleware } from './getDefaultMiddleware'
import { buildGetDefaultMiddleware } from './getDefaultMiddleware'
import type {
  ExtractDispatchExtensions,
  ExtractStoreExtensions,
  ExtractStateExtensions,
  UnknownIfNonSpecific,
} from './tsHelpers'
import type { Tuple } from './utils'
import type { GetDefaultEnhancers } from './getDefaultEnhancers'
import { buildGetDefaultEnhancers } from './getDefaultEnhancers'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Options for `configureStore()`.
 *
 * @public
 */
export interface ConfigureStoreOptions<
  S = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<Middlewares<S>>,
  E extends Tuple<Enhancers> = Tuple<Enhancers>,
  P = S,
> {
  reducer: Reducer<S, A, P> | ReducersMapObject<S, A, P>
  middleware?: (getDefaultMiddleware: GetDefaultMiddleware<S>) => M
  devTools?: boolean | DevToolsOptions
  preloadedState?: P
  enhancers?: (getDefaultEnhancers: GetDefaultEnhancers<M>) => E
}

export type Middlewares<S> = ReadonlyArray<Middleware<{}, S>>

type Enhancers = ReadonlyArray<StoreEnhancer>

export type EnhancedStore<
  S = any,
  A extends Action = UnknownAction,
  E extends Enhancers = Enhancers,
> = ExtractStoreExtensions<E> & Store<S, A, UnknownIfNonSpecific<ExtractStateExtensions<E>>>

export function configureStore<
  S = any,
  A extends Action = UnknownAction,
  M extends Tuple<Middlewares<S>> = Tuple<[ThunkMiddlewareFor<S>]>,
  E extends Tuple<Enhancers> = Tuple<[StoreEnhancer<{ dispatch: ExtractDispatchExtensions<M> }>, StoreEnhancer]>,
  P = S,
>(options: ConfigureStoreOptions<S, A, M, E, P>): EnhancedStore<S, A, E> {
  const getDefaultMiddleware = buildGetDefaultMiddleware<S>()

  const {
    reducer = undefined,
    middleware,
    devTools = true,
    preloadedState = undefined,
    enhancers = undefined,
  } = options || {}

  let rootReducer: Reducer<S, A, P>

  if (typeof reducer === 'function') {
    rootReducer = reducer
  } else if (isPlainObject(reducer)) {
    rootReducer = combineReducers(reducer) as unknown as Reducer<S, A, P>
  } else {
    throw new Error(
      '`reducer` is a required argument, and must be a function or an object of functions that can be passed to combineReducers',
    )
  }

  if (!IS_PRODUCTION && middleware && typeof middleware !== 'function') {
    throw new Error('`middleware` field must be a callback')
  }

  let finalMiddleware: Tuple<Middlewares<S>>
  if (typeof middleware === 'function') {
    finalMiddleware = middleware(getDefaultMiddleware)

    if (!IS_PRODUCTION && !Array.isArray(finalMiddleware)) {
      throw new Error('when using a middleware builder function, an array of middleware must be returned')
    }
  } else {
    finalMiddleware = getDefaultMiddleware()
  }
  if (!IS_PRODUCTION && finalMiddleware.some((item: any) => typeof item !== 'function')) {
    throw new Error('each middleware provided to configureStore must be a function')
  }

  let finalCompose = compose

  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions
      trace: !IS_PRODUCTION,
      ...(typeof devTools === 'object' && devTools),
    })
  }

  const middlewareEnhancer = applyMiddleware(...finalMiddleware)

  const getDefaultEnhancers = buildGetDefaultEnhancers<M>(middlewareEnhancer)

  if (!IS_PRODUCTION && enhancers && typeof enhancers !== 'function') {
    throw new Error('`enhancers` field must be a callback')
  }

  let storeEnhancers = typeof enhancers === 'function' ? enhancers(getDefaultEnhancers) : getDefaultEnhancers()

  if (!IS_PRODUCTION && !Array.isArray(storeEnhancers)) {
    throw new Error('`enhancers` callback must return an array')
  }
  if (!IS_PRODUCTION && storeEnhancers.some((item: any) => typeof item !== 'function')) {
    throw new Error('each enhancer provided to configureStore must be a function')
  }
  if (!IS_PRODUCTION && finalMiddleware.length && !storeEnhancers.includes(middlewareEnhancer)) {
    console.error(
      'middlewares were provided, but middleware enhancer was not included in final enhancers - make sure to call `getDefaultEnhancers`',
    )
  }

  const composedEnhancer: StoreEnhancer<any> = finalCompose(...storeEnhancers)

  return createStore(rootReducer, preloadedState as P, composedEnhancer)
}
