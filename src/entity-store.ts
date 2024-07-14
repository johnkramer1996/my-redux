import { createSlice, configureStore, Draft } from '@reduxjs/toolkit'
import { createEntityAdapter } from './finished/createEntityAdapter'
import { PayloadAction } from './@reduxjs/ts'

export type Book = { bookId: string; title: string; authorId: string }

const booksAdapter = createEntityAdapter({
  selectId: (m: Book) => m.bookId,
  sortComparer: (a, b) => a.title.localeCompare(b.title),
})
const booksSlice = createSlice({
  name: 'books',
  initialState: booksAdapter.getInitialState(),
  reducers: {
    bookRemoveOne: booksAdapter.removeOne,
    bookRemoveMany: booksAdapter.removeMany,
    bookAdded: booksAdapter.addOne,
    bookUpdated: (state, action: PayloadAction<Partial<Book> & Pick<Book, 'bookId'>>) => {
      booksAdapter.updateOne(state, { id: action.payload.bookId, changes: action.payload })
    },
    bookTest: (state) => {
      // booksAdapter.removeAll(state)
      booksAdapter.upsertMany(state, [
        { bookId: 'a', title: 'Book 123', authorId: '123' },
        { bookId: 'a2', title: 'Book 432', authorId: '123' },
      ])
    },
  },
})

export type Member = { memberId: string; name: string }

const membersAdapter = createEntityAdapter({
  selectId: (m: Member) => m.memberId,
})

const membersSlice = createSlice({
  name: 'members',
  initialState: membersAdapter.getInitialState(),
  reducers: {
    memberAdded: (state, action: PayloadAction<Member>) => {
      membersAdapter.addOne(state, action.payload)
    },
  },
})

const { bookAdded, bookRemoveOne, bookRemoveMany, bookTest, bookUpdated } = booksSlice.actions
const { memberAdded } = membersSlice.actions

export const store = configureStore({
  reducer: {
    books: booksSlice.reducer,
    member: membersSlice.reducer,
  },
})

export const booksSelectors = booksAdapter.getSelectors<ReturnType<typeof store.getState>>((state) => state.books)
export const membersSelectors = membersAdapter.getSelectors<ReturnType<typeof store.getState>>((state) => state.member)

store.dispatch(bookAdded({ bookId: 'b', title: 'second', authorId: '1' }))
store.dispatch(bookAdded({ bookId: 'c', title: 'Third', authorId: '1' }))
store.dispatch(bookAdded({ bookId: 'a', title: 'First', authorId: '1' }))
// store.dispatch(bookTest())
store.dispatch(bookRemoveOne('a'))
// store.dispatch(bookRemoveOne('b'))
store.dispatch(bookUpdated({ bookId: 'b', title: 'Second (altered)' }))
store.dispatch(memberAdded({ memberId: '1', name: 'Vitalii' }))
