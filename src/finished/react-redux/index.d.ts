import * as React from 'react'
import { Context, ReactNode, ComponentType, ComponentClass, ClassAttributes, JSX, FunctionComponent } from 'react'
import { Action, UnknownAction, Store, Dispatch } from 'redux'

/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

type VoidFunc = () => void
type Listener = {
  callback: VoidFunc
  next: Listener | null
  prev: Listener | null
}
declare function createListenerCollection(): {
  clear(): void
  notify(): void
  get(): Listener[]
  subscribe(callback: () => void): () => void
}
type ListenerCollection = ReturnType<typeof createListenerCollection>
interface Subscription {
  addNestedSub: (listener: VoidFunc) => VoidFunc
  notifyNestedSubs: VoidFunc
  handleChangeWrapper: VoidFunc
  isSubscribed: () => boolean
  onStateChange?: VoidFunc | null
  trySubscribe: VoidFunc
  tryUnsubscribe: VoidFunc
  getListeners: () => ListenerCollection
}

interface ProviderProps<A extends Action<string> = UnknownAction, S = unknown> {
  store: Store<S, A>
  serverState?: S
  context?: Context<ReactReduxContextValue<S, A> | null>
  children: ReactNode
}
declare function Provider<A extends Action<string> = UnknownAction, S = unknown>({
  store,
  context,
  children,
}: ProviderProps<A, S>): React.JSX.Element

interface ReactReduxContextValue<SS = any, A extends Action<string> = UnknownAction> {
  store: Store<SS, A>
  subscription: Subscription
  getServerState?: () => SS
}
declare const ReactReduxContext: Context<ReactReduxContextValue<any, UnknownAction> | null>

interface UseSelectorOptions<Selected = unknown> {
  equalityFn?: EqualityFn<Selected>
}
interface UseSelector<StateType = unknown> {
  <TState extends StateType = StateType, Selected = unknown>(
    selector: (state: TState) => Selected,
    equalityFnOrOptions?: EqualityFn<Selected> | UseSelectorOptions<Selected>,
  ): Selected
  withTypes: <OverrideStateType extends StateType>() => UseSelector<OverrideStateType>
}

declare function createSelectorHook(context?: React.Context<ReactReduxContextValue<any, any> | null>): UseSelector
declare const useSelector: UseSelector<unknown>

type FixTypeLater = any
type EqualityFn<T> = (a: T, b: T) => boolean
type ExtendedEqualityFn<T, P> = (a: T, b: T, c: P, d: P) => boolean
type AnyIfEmpty<T extends object> = keyof T extends never ? any : T
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
interface DispatchProp<A extends Action<string> = UnknownAction> {
  dispatch: Dispatch<A>
}

type InferThunkActionCreatorType<TActionCreator extends (...args: any[]) => any> = TActionCreator extends (
  ...args: infer TParams
) => (...args: any[]) => infer TReturn
  ? (...args: TParams) => TReturn
  : TActionCreator

type HandleThunkActionCreator<TActionCreator> = TActionCreator extends (...args: any[]) => any
  ? InferThunkActionCreatorType<TActionCreator>
  : TActionCreator

type ResolveThunks<TDispatchProps> = TDispatchProps extends {
  [key: string]: any
}
  ? {
      [C in keyof TDispatchProps]: HandleThunkActionCreator<TDispatchProps[C]>
    }
  : TDispatchProps

interface TypedUseSelectorHook<TState> {
  <TSelected>(selector: (state: TState) => TSelected, equalityFn?: EqualityFn<NoInfer<TSelected>>): TSelected
  <Selected = unknown>(selector: (state: TState) => Selected, options?: UseSelectorOptions<Selected>): Selected
}

type NoInfer<T> = [T][T extends any ? 0 : never]

type SelectorFactory<S, TProps, TOwnProps, TFactoryOptions> = (
  dispatch: Dispatch<Action<string>>,
  factoryOptions: TFactoryOptions,
) => Selector<S, TProps, TOwnProps>

type Selector<S, TProps, TOwnProps = null> = TOwnProps extends null | undefined
  ? (state: S) => TProps
  : (state: S, ownProps: TOwnProps) => TProps

declare function shallowEqual(objA: any, objB: any): boolean

declare function defaultNoopBatch(callback: () => void): void

interface UseDispatch<DispatchType extends Dispatch<UnknownAction> = Dispatch<UnknownAction>> {
  <AppDispatch extends DispatchType = DispatchType>(): AppDispatch
  withTypes: <OverrideDispatchType extends DispatchType>() => UseDispatch<OverrideDispatchType>
}
/**
 * Hook factory, which creates a `useDispatch` hook bound to a given context.
 *
 * @param {React.Context} [context=ReactReduxContext] Context passed to your `<Provider>`.
 * @returns {Function} A `useDispatch` hook bound to the specified context.
 */
declare function createDispatchHook<StateType = unknown, ActionType extends Action = UnknownAction>(
  context?: Context<ReactReduxContextValue<StateType, ActionType> | null>,
): UseDispatch<Dispatch<ActionType>>

declare const useDispatch: UseDispatch<Dispatch<UnknownAction>>

type ExtractStoreActionType<StoreType extends Store> = StoreType extends Store<any, infer ActionType>
  ? ActionType
  : never

interface UseStore<StoreType extends Store> {
  (): StoreType
  <
    StateType extends ReturnType<StoreType['getState']> = ReturnType<StoreType['getState']>,
    ActionType extends Action = ExtractStoreActionType<Store>,
  >(): Store<StateType, ActionType>
  withTypes: <OverrideStoreType extends StoreType>() => UseStore<OverrideStoreType>
}
declare function createStoreHook<StateType = unknown, ActionType extends Action = Action>(
  context?: Context<ReactReduxContextValue<StateType, ActionType> | null>,
): UseStore<Store<StateType, ActionType, {}>>
declare const useStore: UseStore<Store<unknown, Action, {}>>

declare const batch: typeof defaultNoopBatch

export {
  AnyIfEmpty,
  DispatchProp,
  DistributiveOmit,
  EqualityFn,
  ExtendedEqualityFn,
  FixTypeLater,
  HandleThunkActionCreator,
  InferThunkActionCreatorType,
  Provider,
  ProviderProps,
  ReactReduxContext,
  ReactReduxContextValue,
  ResolveThunks,
  Selector,
  SelectorFactory,
  Subscription,
  TypedUseSelectorHook,
  UseDispatch,
  UseSelector,
  UseStore,
  batch,
  createDispatchHook,
  createSelectorHook,
  createStoreHook,
  shallowEqual,
  useDispatch,
  useSelector,
  useStore,
}
