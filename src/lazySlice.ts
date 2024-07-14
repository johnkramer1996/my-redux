import { StateFromReducersMapObject, createSlice } from '@reduxjs/toolkit'
import { ExistingSliceLike, type WithSlice } from './finished/combineSlices'
import { AppStore, appStore, innerReducer } from './store'

const lazySlice = createSlice({
  name: 'lazy',
  initialState: {
    value: 1,
  },
  reducers: {
    addTodo: () => {},
  },
  selectors: {
    selectItems: (state) => state.value,
  },
})

declare module './store' {
  export interface LazyLoadedSlices extends WithSlice<typeof lazySlice> {}
}

const withCounter = innerReducer.inject(lazySlice)
const lazySliceInjected = lazySlice.injectInto(innerReducer, {})

const selectors = lazySlice.getSelectors()
const selectorsInjected = lazySliceInjected.getSelectors()
const a = lazySlice.selectSlice({ lazy: { value: 1 } })

// @ts-expect-error
selectors.selectItems(appStore.getState().root.lazy)
selectorsInjected.selectItems(appStore.getState().root.lazy)

export const wrappedSelectCounterValue = withCounter.selector(
  (rootState) => rootState.lazy.value, // number
  (root: AppStore) => root.root,
)

const store = appStore.getState()
wrappedSelectCounterValue(store)
