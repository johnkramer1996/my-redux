// src/createReducer.ts
import { produce as createNextState, isDraft, isDraftable } from 'immer'

function freezeDraftable(val) {
  return isDraftable(val) ? createNextState(val, () => {}) : val
}

// src/mapBuilders.ts
function executeReducerBuilderCallback(builderCallback) {
  const actionsMap = {}
  const actionMatchers = []
  let defaultCaseReducer
  const builder = {
    addCase(typeOrActionCreator, reducer) {
      const type = typeof typeOrActionCreator === 'string' ? typeOrActionCreator : typeOrActionCreator.type
      actionsMap[type] = reducer
      return builder
    },
    addMatcher(matcher, reducer) {
      actionMatchers.push({ matcher, reducer })
      return builder
    },
    addDefaultCase(reducer) {
      defaultCaseReducer = reducer
      return builder
    },
  }
  builderCallback(builder)
  return [actionsMap, actionMatchers, defaultCaseReducer]
}

// src/createReducer.ts
function isStateFunction(x) {
  return typeof x === 'function'
}
function createReducer(initialState, mapOrBuilderCallback) {
  let [actionsMap, finalActionMatchers, finalDefaultCaseReducer] = executeReducerBuilderCallback(mapOrBuilderCallback)
  let getInitialState
  if (isStateFunction(initialState)) {
    getInitialState = () => freezeDraftable(initialState())
  } else {
    const frozenInitialState = freezeDraftable(initialState)
    getInitialState = () => frozenInitialState
  }
  function reducer(state = getInitialState(), action) {
    let caseReducers = [
      actionsMap[action.type],
      ...finalActionMatchers.filter(({ matcher }) => matcher(action)).map(({ reducer: reducer2 }) => reducer2),
    ]
    if (caseReducers.filter((cr) => !!cr).length === 0) {
      caseReducers = [finalDefaultCaseReducer]
    }

    return caseReducers.reduce((previousState, caseReducer) => {
      if (caseReducer) {
        if (isDraft(previousState)) {
          const draft = previousState
          const result = caseReducer(draft, action)
          if (result === void 0) {
            return previousState
          }
          return result
        } else if (!isDraftable(previousState)) {
          const result = caseReducer(previousState, action)
          if (result === void 0) {
            if (previousState === null) {
              return previousState
            }
          }
          return result
        } else {
          const state = createNextState(previousState, (draft) => {
            return caseReducer(draft, action)
          })
          return state
        }
      }
      return previousState
    }, state)
  }
  reducer.getInitialState = getInitialState
  return reducer
}

export { createReducer }
