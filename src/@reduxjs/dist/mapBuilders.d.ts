import type { Action } from 'redux'
import type { CaseReducer, CaseReducers, ActionMatcherDescriptionCollection } from './createReducer'
import type { TypeGuard } from './tsHelpers'

export interface TypedActionCreator<Type extends string> {
  (...args: any[]): Action<Type>
  type: Type
}

export interface ActionReducerMapBuilder<State> {
  addCase<ActionCreator extends TypedActionCreator<string>>(
    actionCreator: ActionCreator,
    reducer: CaseReducer<State, ReturnType<ActionCreator>>,
  ): ActionReducerMapBuilder<State>
  addCase<Type extends string, A extends Action<Type>>(
    type: Type,
    reducer: CaseReducer<State, A>,
  ): ActionReducerMapBuilder<State>

  addMatcher<A>(
    matcher: TypeGuard<A> | ((action: any) => boolean),
    reducer: CaseReducer<State, A extends Action ? A : A & Action>,
  ): Omit<ActionReducerMapBuilder<State>, 'addCase'>
  addDefaultCase(reducer: CaseReducer<State, Action>): {}
}
export declare function executeReducerBuilderCallback<S>(
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
): [CaseReducers<S, any>, ActionMatcherDescriptionCollection<S>, CaseReducer<S, Action> | undefined]
