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

export function executeReducerBuilderCallback<S>(
  builderCallback: (builder: ActionReducerMapBuilder<S>) => void,
): [CaseReducers<S, any>, ActionMatcherDescriptionCollection<S>, CaseReducer<S, Action> | undefined] {
  const actionsMap: CaseReducers<S, any> = {}
  const actionMatchers: ActionMatcherDescriptionCollection<S> = []
  let defaultCaseReducer: CaseReducer<S, Action> | undefined
  const builder = {
    addCase(typeOrActionCreator: string | TypedActionCreator<any>, reducer: CaseReducer<S>) {
      if (process.env.NODE_ENV !== 'production') {
        /*
         to keep the definition by the user in line with actual behavior,
         we enforce `addCase` to always be called before calling `addMatcher`
         as matching cases take precedence over matchers
         */
        if (actionMatchers.length > 0) {
          throw new Error('`builder.addCase` should only be called before calling `builder.addMatcher`')
        }
        if (defaultCaseReducer) {
          throw new Error('`builder.addCase` should only be called before calling `builder.addDefaultCase`')
        }
      }
      const type = typeof typeOrActionCreator === 'string' ? typeOrActionCreator : typeOrActionCreator.type
      if (!type) {
        throw new Error('`builder.addCase` cannot be called with an empty action type')
      }
      if (type in actionsMap) {
        throw new Error('`builder.addCase` cannot be called with two reducers for the same action type ' + `'${type}'`)
      }
      actionsMap[type] = reducer
      return builder
    },
    addMatcher<A>(matcher: TypeGuard<A>, reducer: CaseReducer<S, A extends Action ? A : A & Action>) {
      if (process.env.NODE_ENV !== 'production') {
        if (defaultCaseReducer) {
          throw new Error('`builder.addMatcher` should only be called before calling `builder.addDefaultCase`')
        }
      }
      actionMatchers.push({ matcher, reducer })
      return builder
    },
    addDefaultCase(reducer: CaseReducer<S, Action>) {
      if (process.env.NODE_ENV !== 'production') {
        if (defaultCaseReducer) {
          throw new Error('`builder.addDefaultCase` can only be called once')
        }
      }
      defaultCaseReducer = reducer
      return builder
    },
  }
  builderCallback(builder)
  return [actionsMap, actionMatchers, defaultCaseReducer]
}
