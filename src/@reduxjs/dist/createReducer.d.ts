import type { Draft } from 'immer'
import type { Action, Reducer, UnknownAction } from 'redux'
import type { ActionReducerMapBuilder } from './mapBuilders'
import type { NoInfer, TypeGuard } from './tsHelpers'

export type Actions<T extends keyof any = string> = Record<T, Action>
export type ActionMatcherDescription<S, A extends Action> = {
  matcher: TypeGuard<A>
  reducer: CaseReducer<S, NoInfer<A>>
}
export type ReadonlyActionMatcherDescriptionCollection<S> = ReadonlyArray<ActionMatcherDescription<S, any>>
export type ActionMatcherDescriptionCollection<S> = Array<ActionMatcherDescription<S, any>>

export type CaseReducer<S = any, A extends Action = UnknownAction> = (
  state: Draft<S>,
  action: A,
) => NoInfer<S> | void | Draft<NoInfer<S>>

export type CaseReducers<S, AS extends Actions> = {
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void
}
export type NotFunction<T> = T extends Function ? never : T
export type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
  getInitialState: () => S
}

export declare function createReducer<S extends NotFunction<any>>(
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
): ReducerWithInitialState<S>
