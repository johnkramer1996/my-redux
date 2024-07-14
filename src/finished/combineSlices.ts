import { Reducer, UnknownAction, combineReducers } from 'redux'
import { NonUndefined } from '../@reduxjs/ts/tsHelpers'
import { UnionToIntersection } from '@reduxjs/toolkit/dist/tsHelpers'
import { emplace } from '../@reduxjs/ts/utils'
import { nanoid } from '@reduxjs/toolkit'

type Id<T> = { [K in keyof T]: T[K] } & {}

type Tail<T extends any[]> = T extends [any, ...infer Tail] ? Tail : never
type SliceLike<ReducerPath extends string, State> = {
  reducerPath: ReducerPath
  reducer: Reducer<State>
}
type WithOptionalProp<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

type AnySliceLike = SliceLike<string, any>

type SliceLikeReducerPath<A extends AnySliceLike> = A extends SliceLike<infer ReducerPath, any> ? ReducerPath : never

type SliceLikeState<A extends AnySliceLike> = A extends SliceLike<any, infer State> ? State : never

export type WithSlice<A extends AnySliceLike> = {
  [Path in SliceLikeReducerPath<A>]: SliceLikeState<A>
}

type ReducerMap = Record<string, Reducer>

export type ExistingSliceLike<DeclaredState> = {
  [ReducerPath in keyof DeclaredState]: SliceLike<ReducerPath & string, NonUndefined<DeclaredState[ReducerPath]>>
}[keyof DeclaredState]

export type InjectConfig = {
  overrideExisting?: boolean
}

type StateFromReducersMapObject<M> = M[keyof M] extends Reducer<any, any, any> | undefined
  ? {
      [P in keyof M]: M[P] extends Reducer<infer S, any, any> ? S : never
    }
  : never

export interface CombinedSliceReducer<InitialState, DeclaredState = InitialState>
  extends Reducer<DeclaredState, UnknownAction, Partial<DeclaredState>> {
  withLazyLoadedSlices<Lazy = {}>(): CombinedSliceReducer<InitialState, Id<DeclaredState & Partial<Lazy>>>

  inject<Sl extends Id<ExistingSliceLike<DeclaredState>>>(
    slice: Sl,
    config?: InjectConfig,
  ): CombinedSliceReducer<InitialState, Id<DeclaredState & WithSlice<Sl>>>

  inject<ReducerPath extends string, State>(
    slice: SliceLike<ReducerPath, State & (ReducerPath extends keyof DeclaredState ? never : State)>,
    config?: InjectConfig,
  ): CombinedSliceReducer<InitialState, Id<DeclaredState & WithSlice<SliceLike<ReducerPath, State>>>>

  selector: {
    <Selector extends (state: DeclaredState, ...args: any[]) => unknown>(selectorFn: Selector): (
      state: WithOptionalProp<Parameters<Selector>[0], keyof Omit<DeclaredState, keyof InitialState>>,
      ...args: Tail<Parameters<Selector>>
    ) => ReturnType<Selector>

    <Selector extends (state: DeclaredState, ...args: any[]) => unknown, RootState>(
      selectorFn: Selector,
      selectState: (
        rootState: RootState,
        ...args: Tail<Parameters<Selector>>
      ) => WithOptionalProp<Parameters<Selector>[0], Exclude<keyof DeclaredState, keyof InitialState>>,
    ): (state: RootState, ...args: Tail<Parameters<Selector>>) => ReturnType<Selector>
    original: (state: DeclaredState) => InitialState & Partial<DeclaredState>
  }
}
type InitialState<Slices extends Array<AnySliceLike | ReducerMap>> = UnionToIntersection<
  Slices[number] extends infer Slice
    ? Slice extends AnySliceLike
      ? WithSlice<Slice>
      : StateFromReducersMapObject<Slice>
    : never
>

const isSliceLike = (maybeSliceLike: AnySliceLike | ReducerMap): maybeSliceLike is AnySliceLike =>
  'reducerPath' in maybeSliceLike && typeof maybeSliceLike.reducerPath === 'string'

const getReducers = (slices: Array<AnySliceLike | ReducerMap>) =>
  slices.flatMap((sliceOrMap) =>
    isSliceLike(sliceOrMap) ? [[sliceOrMap.reducerPath, sliceOrMap.reducer] as const] : Object.entries(sliceOrMap),
  )

const ORIGINAL_STATE = Symbol.for('rtk-state-proxy-original')

const isStateProxy = (value: any) => !!value && !!value[ORIGINAL_STATE]

const stateProxyMap = new WeakMap<object, object>()

const createStateProxy = <State extends object>(state: State, reducerMap: Partial<Record<string, Reducer>>) =>
  emplace(stateProxyMap, state, {
    insert: () =>
      new Proxy(state, {
        get: (target, prop, receiver) => {
          if (prop === ORIGINAL_STATE) return target
          const result = Reflect.get(target, prop, receiver)
          if (typeof result === 'undefined') {
            const reducer = reducerMap[prop.toString()]
            if (reducer) {
              // ensure action type is random, to prevent reducer treating it differently
              const reducerResult = reducer(undefined, { type: nanoid() })
              if (typeof reducerResult === 'undefined') {
                throw new Error(`error`)
              }
              return reducerResult
            }
          }
          return result
        },
      }),
  }) as State

const original = (state: any) => {
  if (isStateProxy(state)) return state[ORIGINAL_STATE]
  throw new Error('original must be used on state Proxy')
}

const noopReducer: Reducer<Record<string, any>> = (state = {}) => state

export function combineSlices<Slices extends Array<AnySliceLike | ReducerMap>>(
  ...slices: Slices
): CombinedSliceReducer<Id<InitialState<Slices>>> {
  const reducerMap = Object.fromEntries<Reducer>(getReducers(slices))

  const getReducer = () => (Object.keys(reducerMap).length ? combineReducers(reducerMap) : noopReducer)

  let reducer = getReducer()

  function combinedReducer(state: Record<string, unknown>, action: UnknownAction) {
    return reducer(state, action)
  }

  combinedReducer.withLazyLoadedSlices = () => combinedReducer

  const inject = (slice: AnySliceLike, config: InjectConfig = {}): typeof combinedReducer => {
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
    function makeSelector<State extends object, RootState, Args extends any[]>(
      selectorFn: (state: State, ...args: Args) => any,
      selectState?: (rootState: RootState, ...args: Args) => State,
    ) {
      return function selector(state: State, ...args: Args) {
        return selectorFn(
          createStateProxy(selectState ? selectState(state as any, ...args) : state, reducerMap),
          ...args,
        )
      }
    },
    { original },
  )

  return Object.assign(combinedReducer, { inject, selector }) as any
}
