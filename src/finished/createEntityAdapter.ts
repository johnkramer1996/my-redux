import { Draft, current, isDraft, produce } from 'immer'
import { createSelector } from 'reselect'
import { isAction } from 'redux'

export type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False

export type CastAny<T, CastTo> = IsAny<T, CastTo, T>

export type WithOptionalProp<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type WithRequiredProp<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
  payload: P
  type: T
} & ([M] extends [never]
  ? {}
  : {
      meta: M
    }) &
  ([E] extends [never]
    ? {}
    : {
        error: E
      })

export function isFSA(action: unknown): action is {
  type: string
  payload?: unknown
  error?: unknown
  meta?: unknown
} {
  return isAction(action) && Object.keys(action).every(isValidKey)
}
function isValidKey(key: string) {
  return ['type', 'payload', 'error', 'meta'].indexOf(key) > -1
}
export type DraftableEntityState<T, Id extends EntityId> = EntityState<T, Id> | Draft<EntityState<T, Id>>

const ensureEntitiesArray = <T, Id extends EntityId>(entities: EntityRecordOrArray<T, Id>): Array<T> =>
  Array.isArray(entities) ? entities : Object.values(entities)

export type EntityId = number | string
export interface EntityState<T, Id extends EntityId> {
  ids: Id[]
  entities: Record<Id, T>
}
export const isDraftTyped = isDraft as <T>(value: T | Draft<T>) => value is Draft<T>
export function getCurrent<T>(value: T): T {
  return isDraft(value) ? current(value) : value
}

type Comparer<T> = (a: T, b: T) => number
type IdSelector<T, Id extends EntityId> = (model: T) => Id
type Update<T, Id extends EntityId> = { id: Id; changes: Partial<T> }
type EntityRecordOrArray<T, Id extends EntityId> = Record<Id, T> | readonly T[]
export interface EntitySelectors<T, V, Id extends EntityId> {
  selectIds: (state: V) => Id[]
  selectEntities: (state: V) => Record<Id, T>
  selectAll: (state: V) => T[]
  selectTotal: (state: V) => number
  selectById: (state: V, id: Id) => T
}

export interface EntitySelectorFactory<T, Id extends EntityId> {
  getSelectors(): EntitySelectors<T, EntityState<T, Id>, Id>
  getSelectors<S>(selectState: (state: S) => EntityState<T, Id>): EntitySelectors<T, S, Id>
}

export interface EntityAdapterOptions<T, Id extends EntityId> {
  selectId?: IdSelector<T, Id>
  sortComparer?: false | Comparer<T>
}

export interface EntityAdapter<T, Id extends EntityId>
  extends Required<EntityAdapterOptions<T, Id>>,
    EntityStateFactory<T, Id>,
    EntityStateAdapter<T, Id>,
    EntitySelectorFactory<T, Id> {}

export function createEntityAdapter<T, Id extends EntityId = EntityId>(
  options: WithRequiredProp<EntityAdapterOptions<T, Id>, 'selectId'>,
): EntityAdapter<T, Id>

export function createEntityAdapter<T extends { id: EntityId }>(
  options?: Omit<EntityAdapterOptions<T, T['id']>, 'selectId'>,
): EntityAdapter<T, T['id']>

export function createEntityAdapter<T>(options: EntityAdapterOptions<T, EntityId> = {}): EntityAdapter<T, EntityId> {
  const { selectId, sortComparer }: Required<EntityAdapterOptions<T, EntityId>> = {
    sortComparer: false,
    selectId: (instance: any) => instance.id,
    ...options,
  }

  const stateAdapter: EntityStateAdapter<T, EntityId> = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer)
    : createUnsortedStateAdapter(selectId)

  const stateFactory: EntityStateFactory<T, EntityId> = createInitialStateFactory<T, EntityId>(stateAdapter)
  const selectorsFactory: EntitySelectorFactory<T, EntityId> = createSelectorsFactory<T, EntityId>()

  const adapter: EntityAdapter<T, EntityId> = {
    ...stateAdapter,
    ...stateFactory,
    ...selectorsFactory,
    selectId,
    sortComparer,
  }

  return adapter
}

function getInit<T, Id extends EntityId>(): EntityState<T, Id> {
  return {
    ids: [],
    entities: {} as Record<Id, T>,
  }
}

export interface EntityStateFactory<T, Id extends EntityId> {
  getInitialState(state?: undefined, entities?: Record<Id, T> | readonly T[]): EntityState<T, Id>
  getInitialState<S extends {}>(state: S, entities?: Record<Id, T> | readonly T[]): EntityState<T, Id> & S
}

function createInitialStateFactory<T, Id extends EntityId>(
  stateAdapter: EntityStateAdapter<T, Id>,
): EntityStateFactory<T, EntityId> {
  const getInitialState = <S extends {} | undefined = {}>(
    additedState?: S,
    entities?: Record<Id, T> | readonly T[],
  ): EntityState<T, Id> & S => {
    const state = Object.assign(getInit<T, Id>(), additedState)

    return entities ? stateAdapter.setAll(state, entities) : state
  }

  return { getInitialState }
}

function createSelectorsFactory<T, Id extends EntityId>(): EntitySelectorFactory<T, Id> {
  function getSelectors(selectState?: undefined): EntitySelectors<T, EntityState<T, Id>, Id>
  function getSelectors<V>(selectState: (state?: V) => EntityState<T, Id>): EntitySelectors<T, V, Id>

  function getSelectors<V>(selectState?: (state: V) => EntityState<T, Id>): EntitySelectors<T, any, Id> {
    const selectIds = (state: EntityState<T, Id>) => state.ids
    const selectEntities = (state: EntityState<T, Id>) => state.entities
    const selectAll = createSelector(selectEntities, selectIds, (entities: Record<Id, T>, ids: Id[]) =>
      ids.map<T>((id) => entities[id]),
    )
    const selectTotal = (state: EntityState<T, Id>) => state.ids.length
    const selectById = (entities: Record<Id, T>, id: Id) => entities[id]
    const selectId = (_: unknown, id: Id) => id

    if (selectState) {
      return {
        selectIds: createSelector(selectState, selectIds),
        selectEntities: createSelector(selectState, selectEntities),
        selectAll: createSelector(selectState, selectAll),
        selectTotal: createSelector(selectState, selectTotal),
        selectById: createSelector(createSelector(selectState, selectEntities), selectId, selectById),
      }
    }

    return {
      selectIds,
      selectEntities,
      selectAll,
      selectTotal,
      selectById: createSelector(selectEntities, selectId, selectById),
    }
  }

  return { getSelectors }
}

export interface EntityStateAdapter<T, Id extends EntityId> {
  removeAll<S extends EntityState<T, Id>>(state: S): S
  addOne<S extends EntityState<T, Id>>(state: S, entity: T): S
  addOne<S extends EntityState<T, Id>>(state: S, entity: PayloadAction<T>): S
  addMany<S extends EntityState<T, Id>>(state: S, entities: EntityRecordOrArray<T, Id>): S
  addMany<S extends EntityState<T, Id>>(state: S, entities: PayloadAction<EntityRecordOrArray<T, Id>>): S
  setOne<S extends EntityState<T, Id>>(state: S, entity: T): S
  setOne<S extends EntityState<T, Id>>(state: S, entity: PayloadAction<T>): S
  setMany<S extends EntityState<T, Id>>(state: S, entities: EntityRecordOrArray<T, Id>): S
  setMany<S extends EntityState<T, Id>>(state: S, entities: PayloadAction<EntityRecordOrArray<T, Id>>): S
  setAll<S extends EntityState<T, Id>>(state: S, entity: EntityRecordOrArray<T, Id>): S
  setAll<S extends EntityState<T, Id>>(state: S, entity: PayloadAction<EntityRecordOrArray<T, Id>>): S
  updateOne<S extends EntityState<T, Id>>(state: S, update: Update<T, Id>): S
  updateOne<S extends EntityState<T, Id>>(state: S, update: PayloadAction<Update<T, Id>>): S
  updateMany<S extends EntityState<T, Id>>(state: S, update: Update<T, Id>[]): S
  updateMany<S extends EntityState<T, Id>>(state: S, update: PayloadAction<Update<T, Id>[]>): S
  removeOne<S extends EntityState<T, Id>>(state: S, key: Id): S
  removeOne<S extends EntityState<T, Id>>(state: S, key: PayloadAction<Id>): S
  removeMany<S extends EntityState<T, Id>>(state: S, entities: Array<Id>): S
  removeMany<S extends EntityState<T, Id>>(state: S, entities: PayloadAction<Array<Id>>): S
  upsertOne<S extends EntityState<T, Id>>(state: S, entity: T): S
  upsertOne<S extends EntityState<T, Id>>(state: S, entity: PayloadAction<T>): S
  upsertMany<S extends EntityState<T, Id>>(state: S, entities: EntityRecordOrArray<T, Id>): S
  upsertMany<S extends EntityState<T, Id>>(state: S, entities: PayloadAction<EntityRecordOrArray<T, Id>>): S
}

function createUnsortedStateAdapter<T, Id extends EntityId>(selectId: IdSelector<T, Id>): EntityStateAdapter<T, Id> {
  type State = EntityState<T, Id>

  const removeAll = (state: State): void => {
    state.ids = []
    state.entities = {} as Record<Id, T>
  }

  const addOne = (state: State, entity: T): void => {
    const key = selectId(entity)
    if (key in state.entities) return

    state.ids.push(key)
    state.entities[key] = entity
  }

  const addMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    for (const entity of ensureEntitiesArray(entities)) addOne(state, entity)
  }

  const setOne = (state: State, entity: T): void => {
    const key = selectId(entity)
    if (!(key in state.entities)) state.ids.push(key)

    state.entities[key] = entity
  }

  const setMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    for (const entity of ensureEntitiesArray(entities)) setOne(state, entity)
  }

  const setAll = (state: EntityState<T, Id>, entities: EntityRecordOrArray<T, Id>): void => {
    state.ids = []
    state.entities = {} as Record<Id, T>
    addMany(state, entities)
  }

  const updateOne = (state: State, update: Update<T, Id>): void => {
    return updateMany(state, [update])
  }

  const updateMany = (state: State, updates: Update<T, Id>[]): void => {
    const updatesPerEntity = updates.reduce((updatesPerEntity, update) => {
      if (update.id in state.entities) {
        updatesPerEntity[update.id] = {
          id: update.id,
          changes: {
            ...(updatesPerEntity[update.id] ? (updatesPerEntity[update.id] as Update<T, Id>).changes : null),
            ...update.changes,
          },
        }
      }
      return updatesPerEntity
    }, {} as Record<EntityId, Update<T, Id>>)

    updates = Object.values(updatesPerEntity)

    const didMutateEntities = updates.length > 0
    if (!didMutateEntities) return

    const mutateIds = updates.filter((update) => {
      const original = state.entities[update.id]

      const updated = Object.assign({}, original, update.changes)
      const newKey = selectId(updated)
      const hasNewKey = newKey !== update.id

      if (hasNewKey) {
        delete state.entities[update.id]
      }

      state.entities[newKey] = updated

      return hasNewKey
    })

    const didMutateIds = mutateIds.length > 0

    if (didMutateIds) {
      state.ids = Object.values(state.entities).map((e) => selectId(e as T))
    }
  }

  const removeOne = (state: State, key: Id): void => {
    removeMany(state, [key])
  }

  const removeMany = (state: State, keys: Array<Id>): void => {
    const didMutate =
      keys.filter((key) => {
        if (!(key in state.entities)) return

        delete state.entities[key]
        return true
      }).length > 0
    if (!didMutate) return

    state.ids = state.ids.filter((id) => id in state.entities)
  }

  const upsertOne = (state: State, entity: T): void => {
    upsertMany(state, [entity])
  }

  const upsertMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    const [added, updated] = splitAddedUpdatedEntities(state, entities, selectId)

    updated.length && updateMany(state, updated)
    added.length && addMany(state, added)
  }

  return {
    removeAll: createStateOperatorWithoutArgument(removeAll),
    addOne: createStateOperator(addOne),
    addMany: createStateOperator(addMany),
    setOne: createStateOperator(setOne),
    setMany: createStateOperator(setMany),
    setAll: createStateOperator(setAll),
    updateOne: createStateOperator(updateOne),
    updateMany: createStateOperator(updateMany),
    removeOne: createStateOperator(removeOne),
    removeMany: createStateOperator(removeMany),
    upsertOne: createStateOperator(upsertOne),
    upsertMany: createStateOperator(upsertMany),
  } satisfies EntityStateAdapter<T, Id>
}

function createSortedStateAdapter<T, Id extends EntityId>(
  selectId: IdSelector<T, Id>,
  comparer: Comparer<T>,
): EntityStateAdapter<T, Id> {
  type State = EntityState<T, Id>
  const addOne = (state: State, entity: T): void => {
    addMany(state, [entity])
  }

  const addMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    entities = ensureEntitiesArray(entities)

    const models = entities.filter((e) => !(selectId(e) in state.entities))

    if (models.length) mergeFunction(state, models)
  }

  const setOne = (state: State, entity: T): void => {
    const key = selectId(entity)
    if (!(key in state.entities)) state.ids.push(key)

    state.entities[key] = entity
  }

  const setMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    entities = ensureEntitiesArray(entities)
    if (entities.length !== 0) {
      for (const item of entities) {
        delete (state.entities as Record<Id, T>)[selectId(item)]
      }
      mergeFunction(state, entities)
    }
  }

  const setAll = (state: EntityState<T, Id>, entities: EntityRecordOrArray<T, Id>): void => {
    state.ids = []
    state.entities = {} as Record<Id, T>
    addMany(state, entities)
  }

  const mergeFunction = <S extends EntityState<T, Id>>(
    state: S,
    addedItems: ReadonlyArray<T>,
    appliedUpdates?: boolean,
    replacedIds?: boolean,
  ) => {
    const currentEntities = state.entities
    const currentIds = state.ids

    const stateEntities = state.entities

    const ids = replacedIds ? Array.from(new Set(currentIds)) : currentIds

    let sortedEntities: T[] = []
    for (const id of ids) {
      const entity = currentEntities[id]
      sortedEntities.push(entity)
    }
    const wasPreviouslyEmpty = sortedEntities.length === 0

    for (const item of addedItems) {
      stateEntities[selectId(item)] = item

      if (!wasPreviouslyEmpty) {
        // Binary search insertion generally requires fewer comparisons
        insert(sortedEntities, item, comparer)
      }
    }

    if (wasPreviouslyEmpty) {
      // All we have is the incoming values, sort them
      sortedEntities = addedItems.slice().sort(comparer)
    } else if (appliedUpdates) {
      // We should have a _mostly_-sorted array already
      sortedEntities.sort(comparer)
    }

    const newSortedIds = sortedEntities.map(selectId)

    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }

  const updateOne = (state: State, update: Update<T, Id>): void => {
    return updateMany(state, [update])
  }

  const updateMany = (state: State, updates: Update<T, Id>[]): void => {
    let appliedUpdates = false
    let replacedIds = false

    for (let update of updates) {
      const entity: T | undefined = (state.entities as Record<Id, T>)[update.id]
      if (!entity) {
        continue
      }

      appliedUpdates = true // use sort

      Object.assign(entity, update.changes)
      const newId = selectId(entity)

      if (update.id !== newId) {
        replacedIds = true // use new Set for unique id
        state.ids[state.ids.indexOf(update.id)] = newId
        delete state.entities[update.id]
        state.entities[newId] = entity
      }
    }

    if (appliedUpdates) {
      mergeFunction(state, [], appliedUpdates, replacedIds)
    }
  }

  const upsertOne = (state: State, entity: T): void => {
    upsertMany(state, [entity])
  }

  const upsertMany = (state: State, entities: EntityRecordOrArray<T, Id>): void => {
    const [added, updated] = splitAddedUpdatedEntities(state, entities, selectId)

    updated.length && updateMany(state, updated)
    added.length && addMany(state, added)
  }

  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(selectId)

  return {
    removeOne,
    removeMany,
    removeAll,
    addOne: createStateOperator(addOne),
    addMany: createStateOperator(addMany),
    setOne: createStateOperator(setOne),
    setMany: createStateOperator(setMany),
    setAll: createStateOperator(setAll),
    updateOne: createStateOperator(updateOne),
    updateMany: createStateOperator(updateMany),
    upsertOne: createStateOperator(upsertOne),
    upsertMany: createStateOperator(upsertMany),
  }
}

function splitAddedUpdatedEntities<T, Id extends EntityId>(
  state: DraftableEntityState<T, Id>,
  entities: readonly T[] | Record<Id, T>,
  selectId: IdSelector<T, Id>,
): [T[], Update<T, Id>[]] {
  const added: T[] = []
  const updated: Update<T, Id>[] = []

  for (const entity of ensureEntitiesArray(entities)) {
    const key = selectId(entity)
    if (key in state.entities) {
      updated.push({ id: key, changes: entity })
      continue
    }
    added.push(entity)
  }

  return [added, updated]
}

function areArraysEqual(a: readonly unknown[], b: readonly unknown[]) {
  if (a.length !== b.length) return false

  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] === b[i]) continue
    return false
  }
  return true
}

function findInsertIndex<T>(sortedItems: T[], item: T, comparisonFunction: Comparer<T>): number {
  let lowIndex = 0
  let highIndex = sortedItems.length
  while (lowIndex < highIndex) {
    let middleIndex = (lowIndex + highIndex) >>> 1
    const currentItem = sortedItems[middleIndex] as T
    const res = comparisonFunction(item, currentItem)
    if (res >= 0) {
      lowIndex = middleIndex + 1
    } else {
      highIndex = middleIndex
    }
  }

  return lowIndex
}

function insert<T>(sortedItems: T[], item: T, comparisonFunction: Comparer<T>): T[] {
  const insertAtIndex = findInsertIndex(sortedItems, item, comparisonFunction)

  sortedItems.splice(insertAtIndex, 0, item)

  return sortedItems
}

function createStateOperatorWithoutArgument<T, Id extends EntityId>(mutator: (state: EntityState<T, Id>) => void) {
  const operator = createStateOperator((state: EntityState<T, Id>, _: undefined) => mutator(state))

  return <S extends EntityState<T, Id>>(state: S): S => operator(state, undefined)
}

function createStateOperator<T, Id extends EntityId, R>(mutator: (state: EntityState<T, Id>, arg: R) => void) {
  return function operation<S extends EntityState<T, Id>>(state: S, arg: R | PayloadAction<R>) {
    const isPayloadActionArgument = (arg?: R | PayloadAction<R>): arg is PayloadAction<R> => isFSA(arg)

    const runMutator = (draft: EntityState<T, Id>) => {
      mutator(draft, isPayloadActionArgument(arg) ? arg.payload : arg)
    }

    if (isDraftTyped<DraftableEntityState<T, Id>>(state)) {
      runMutator(state)
      return state
    }

    return produce(state, runMutator)
  }
}
