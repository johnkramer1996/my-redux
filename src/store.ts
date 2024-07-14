import { ThunkDispatch } from 'redux-thunk'
import { TypedUseSelectorHook, UseDispatch } from 'react-redux'
import { useDispatch, useSelector } from './finished/react-redux/hooks'
import { configureStore } from '@reduxjs/toolkit'
import { CombinedSliceReducer, combineSlices } from './finished/combineSlices'
import { createReducer } from './finished/createReducer'
import { createSlice } from './finished/createSlice'
import { produce } from 'immer'

const red = createReducer({ items: [] as number[] }, (builder) => {
  builder.addDefaultCase((state, action) => {})
})

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 1 },
  reducers: { increment: (state) => (state.value++, state) },
})

export const innerReducer = combineSlices(counterSlice).withLazyLoadedSlices<{ lazy: { value: number } }>()

export const appStore = configureStore({
  reducer: {
    root: innerReducer,
  },
})
const lazy = innerReducer.inject({
  reducerPath: 'lazy',
  reducer: (state = { value: 1 }) => {
    return produce(state, (state) => {
      state.value++
    })
  },
})
counterSlice.injectInto(lazy)

export const selectorLazy = lazy.selector(
  (state) => state,
  (root: AppStore) => root.root,
)

export const { increment } = counterSlice.actions

export type AppStore = ReturnType<typeof appStore.getState>
export type AppDispatch = typeof appStore.dispatch
export const useAppDispatch = useDispatch as UseDispatch<AppDispatch>
export const useAppSelector: TypedUseSelectorHook<AppStore> = useSelector
