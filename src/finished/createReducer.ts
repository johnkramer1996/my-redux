import type { Draft } from 'immer'
import { produce as createNextState, isDraft, isDraftable } from 'immer'
import type { Action, Reducer, UnknownAction } from 'redux'
import type { ActionReducerMapBuilder } from './mapBuilders'
import { executeReducerBuilderCallback } from './mapBuilders'
import type { NoInfer, TypeGuard } from './tsHelpers'
import { freezeDraftable } from './utils'

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
  [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : never
}

export type NotFunction<T> = T extends Function ? never : T

function isStateFunction<S>(x: unknown): x is () => S {
  return typeof x === 'function'
}

export type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
  getInitialState: () => S
}

export function createReducer<S extends NotFunction<any>>(
  initialState: S | (() => S),
  mapOrBuilderCallback: (builder: ActionReducerMapBuilder<S>) => void,
): ReducerWithInitialState<S> {
  const [actionsMap, finalActionMatchers, finalDefaultCaseReducer] = executeReducerBuilderCallback(mapOrBuilderCallback)

  const getInitialState = () => freezeDraftable(isStateFunction(initialState) ? initialState() : initialState)

  function reducer(state = getInitialState(), action: any): S {
    const caseReducer = actionsMap[action.type]
    const matchReducers = finalActionMatchers.filter(({ matcher }) => matcher(action)).map(({ reducer }) => reducer)
    caseReducer && matchReducers.unshift(caseReducer)
    const final = matchReducers.length ? matchReducers : finalDefaultCaseReducer ? [finalDefaultCaseReducer] : []
    return final.reduce((previousState, caseReducer): S => {
      if (!caseReducer) return previousState
      if (isDraft(previousState)) {
        const result = caseReducer(previousState as Draft<S>, action)
        if (result === undefined) return previousState
        return result as S
      }
      if (!isDraftable(previousState)) return caseReducer(previousState as any, action) as S
      return createNextState(previousState, (draft) => caseReducer(draft, action) as any)
    }, state)
  }

  reducer.getInitialState = getInitialState

  return reducer as ReducerWithInitialState<S>
}
