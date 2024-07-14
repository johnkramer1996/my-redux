import 'reflect-metadata'

import { createRoot } from 'react-dom/client'
import { Provider } from './finished/react-redux'
import { appStore, increment, selectorLazy, useAppDispatch, useAppSelector } from './store'
import { useForm } from './react-hook-form'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <Provider store={appStore}>
    <App />
  </Provider>,
)

function App() {
  const dispatch = useAppDispatch()
  const value = useAppSelector((state) => state.root.counter.value)
  const onClick = () => {
    dispatch(increment())

    console.log(appStore.getState().root.lazy)
  }

  const form = useForm()

  return (
    <div>
      <button onClick={onClick}>Click</button>
      <button
        onClick={() => {
          import('./lazySlice').then((module) => {})
        }}
      >
        {value}
      </button>
    </div>
  )
}
