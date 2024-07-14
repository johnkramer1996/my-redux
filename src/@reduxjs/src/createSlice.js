import { createReducer } from './createReducer'

function emplace(map, key, handler) {
  if (map.has(key)) {
    let value = map.get(key)
    if (handler.update) {
      value = handler.update(value, key, map)
      map.set(key, value)
    }
    return value
  }

  const inserted = handler.insert(key, map)
  map.set(key, inserted)
  return inserted
}

// src/createAction.ts
function createAction(type, prepareAction) {
  function actionCreator(...args) {
    if (prepareAction) {
      let prepared = prepareAction(...args)

      return { type, payload: prepared.payload }
    }
    return { type, payload: args[0] }
  }
  actionCreator.toString = () => `${type}`
  actionCreator.type = type
  return actionCreator
}

// src/createSlice.ts

function getType(slice, actionKey) {
  return `${slice}/${actionKey}`
}
function buildCreateSlice() {
  return function createSlice2(options) {
    const { name, reducerPath = name } = options
    const reducers = options.reducers || {}
    const reducerNames = Object.keys(reducers)
    const context = {
      sliceCaseReducersByName: {},
      sliceCaseReducersByType: {},
      actionCreators: {},
      sliceMatchers: [],
    }
    const contextMethods = {
      addCase(typeOrActionCreator, reducer2) {
        const type = typeof typeOrActionCreator === 'string' ? typeOrActionCreator : typeOrActionCreator.type
        context.sliceCaseReducersByType[type] = reducer2
        return contextMethods
      },
      // NOT USE
      addMatcher(matcher, reducer2) {
        debugger
        context.sliceMatchers.push({ matcher, reducer: reducer2 })
        return contextMethods
      },
      exposeAction(name2, actionCreator) {
        context.actionCreators[name2] = actionCreator
        return contextMethods
      },
      exposeCaseReducer(name2, reducer2) {
        console.log({ name2 })
        context.sliceCaseReducersByName[name2] = reducer2
        return contextMethods
      },
    }
    reducerNames.forEach((reducerName) => {
      const reducerDefinition = reducers[reducerName]
      const reducerDetails = {
        reducerName,
        type: getType(name, reducerName),
        createNotation: typeof options.reducers === 'function',
      }
      handleNormalReducerDefinition(reducerDetails, reducerDefinition, contextMethods)
    })
    function buildReducer() {
      const [extraReducers = {}, actionMatchers = [], defaultCaseReducer = void 0] =
        typeof options.extraReducers === 'function'
          ? executeReducerBuilderCallback(options.extraReducers)
          : [options.extraReducers]
      const finalCaseReducers = {
        ...extraReducers,
        ...context.sliceCaseReducersByType,
      }
      return createReducer(options.initialState, (builder) => {
        for (let key in finalCaseReducers) {
          builder.addCase(key, finalCaseReducers[key])
        }
        for (let sM of context.sliceMatchers) {
          builder.addMatcher(sM.matcher, sM.reducer)
        }
        for (let m of actionMatchers) {
          builder.addMatcher(m.matcher, m.reducer)
        }
        if (defaultCaseReducer) {
          builder.addDefaultCase(defaultCaseReducer)
        }
      })
    }
    const selectSelf = (state) => state
    const injectedSelectorCache = /* @__PURE__ */ new Map()
    let _reducer
    function reducer(state, action) {
      if (!_reducer) _reducer = buildReducer()
      return _reducer(state, action)
    }
    function getInitialState() {
      if (!_reducer) _reducer = buildReducer()
      return _reducer.getInitialState()
    }
    function makeSelectorProps(reducerPath2, injected = false) {
      function selectSlice(state) {
        let sliceState = state[reducerPath2]
        if (typeof sliceState === 'undefined') {
          if (injected) {
            sliceState = getInitialState()
          }
        }
        return sliceState
      }
      function getSelectors(selectState = selectSelf) {
        const selectorCache = emplace(injectedSelectorCache, injected, {
          insert: () => /* @__PURE__ */ new WeakMap(),
        })
        return emplace(selectorCache, selectState, {
          insert: () => {
            const map = {}
            for (const [name2, selector] of Object.entries(options.selectors ?? {})) {
              map[name2] = wrapSelector(selector, selectState, getInitialState, injected)
            }
            return map
          },
        })
      }
      return {
        reducerPath: reducerPath2,
        getSelectors,
        get selectors() {
          return getSelectors(selectSlice)
        },
        selectSlice,
      }
    }
    const slice = {
      name,
      reducer,
      actions: context.actionCreators,
      caseReducers: context.sliceCaseReducersByName,
      getInitialState,
      ...makeSelectorProps(reducerPath),
    }
    return slice
  }
}
function wrapSelector(selector, selectState, getInitialState, injected) {
  function wrapper(rootState, ...args) {
    let sliceState = selectState(rootState)
    if (typeof sliceState === 'undefined') {
      if (injected) {
        sliceState = getInitialState()
      }
    }
    return selector(sliceState, ...args)
  }
  wrapper.unwrapped = selector
  return wrapper
}
var createSlice = /* @__PURE__ */ buildCreateSlice()

function handleNormalReducerDefinition({ type, reducerName }, maybeReducerWithPrepare, context) {
  let caseReducer
  let prepareCallback
  if ('reducer' in maybeReducerWithPrepare) {
    caseReducer = maybeReducerWithPrepare.reducer
    prepareCallback = maybeReducerWithPrepare.prepare
  } else {
    caseReducer = maybeReducerWithPrepare
  }
  context
    .addCase(type, caseReducer)
    .exposeCaseReducer(reducerName, caseReducer)
    .exposeAction(reducerName, prepareCallback ? createAction(type, prepareCallback) : createAction(type))
}

export { createSlice }
