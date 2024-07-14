// src/entities/entity_state.ts
function getInitialEntityState() {
  return {
    ids: [],
    entities: {},
  }
}
function createInitialStateFactory(stateAdapter) {
  function getInitialState(additionalState = {}, entities) {
    const state = Object.assign(getInitialEntityState(), additionalState)
    return entities ? stateAdapter.setAll(state, entities) : state
  }
  return {
    getInitialState,
  }
}

// src/entities/state_selectors.ts
function createSelectorsFactory() {
  function getSelectors(selectState, options = {}) {
    const { createSelector: createSelector2 = createDraftSafeSelector } = options
    const selectIds = (state) => state.ids
    const selectEntities = (state) => state.entities
    const selectAll = createSelector2(selectIds, selectEntities, (ids, entities) => ids.map((id) => entities[id]))
    const selectId = (_, id) => id
    const selectById = (entities, id) => entities[id]
    const selectTotal = createSelector2(selectIds, (ids) => ids.length)
    if (!selectState) {
      return {
        selectIds,
        selectEntities,
        selectAll,
        selectTotal,
        selectById: createSelector2(selectEntities, selectId, selectById),
      }
    }
    const selectGlobalizedEntities = createSelector2(selectState, selectEntities)
    return {
      selectIds: createSelector2(selectState, selectIds),
      selectEntities: selectGlobalizedEntities,
      selectAll: createSelector2(selectState, selectAll),
      selectTotal: createSelector2(selectState, selectTotal),
      selectById: createSelector2(selectGlobalizedEntities, selectId, selectById),
    }
  }
  return {
    getSelectors,
  }
}

// src/entities/sorted_state_adapter.ts
import { current as current3 } from 'immer'

// src/entities/state_adapter.ts
import { produce as createNextState3, isDraft as isDraft3 } from 'immer'
var isDraftTyped = isDraft3
function createSingleArgumentStateOperator(mutator) {
  const operator = createStateOperator((_, state) => mutator(state))
  return function operation(state) {
    return operator(state, void 0)
  }
}
function createStateOperator(mutator) {
  return function operation(state, arg) {
    function isPayloadActionArgument(arg2) {
      return isFSA(arg2)
    }
    const runMutator = (draft) => {
      if (isPayloadActionArgument(arg)) {
        mutator(arg.payload, draft)
      } else {
        mutator(arg, draft)
      }
    }
    if (isDraftTyped(state)) {
      runMutator(state)
      return state
    }
    return createNextState3(state, runMutator)
  }
}

// src/entities/utils.ts
import { current as current2, isDraft as isDraft4 } from 'immer'
function selectIdValue(entity, selectId) {
  const key = selectId(entity)
  if (process.env.NODE_ENV !== 'production' && key === void 0) {
    console.warn(
      'The entity passed to the `selectId` implementation returned undefined.',
      'You should probably provide your own `selectId` implementation.',
      'The entity that was passed:',
      entity,
      'The `selectId` implementation:',
      selectId.toString(),
    )
  }
  return key
}
function ensureEntitiesArray(entities) {
  if (!Array.isArray(entities)) {
    entities = Object.values(entities)
  }
  return entities
}
function getCurrent(value) {
  return isDraft4(value) ? current2(value) : value
}
function splitAddedUpdatedEntities(newEntities, selectId, state) {
  newEntities = ensureEntitiesArray(newEntities)
  const existingIdsArray = getCurrent(state.ids)
  const existingIds = new Set(existingIdsArray)
  const added = []
  const updated = []
  for (const entity of newEntities) {
    const id = selectIdValue(entity, selectId)
    if (existingIds.has(id)) {
      updated.push({
        id,
        changes: entity,
      })
    } else {
      added.push(entity)
    }
  }
  return [added, updated, existingIdsArray]
}

// src/entities/unsorted_state_adapter.ts
function createUnsortedStateAdapter(selectId) {
  function addOneMutably(entity, state) {
    const key = selectIdValue(entity, selectId)
    if (key in state.entities) {
      return
    }
    state.ids.push(key)
    state.entities[key] = entity
  }
  function addManyMutably(newEntities, state) {
    newEntities = ensureEntitiesArray(newEntities)
    for (const entity of newEntities) {
      addOneMutably(entity, state)
    }
  }
  function setOneMutably(entity, state) {
    const key = selectIdValue(entity, selectId)
    if (!(key in state.entities)) {
      state.ids.push(key)
    }
    state.entities[key] = entity
  }
  function setManyMutably(newEntities, state) {
    newEntities = ensureEntitiesArray(newEntities)
    for (const entity of newEntities) {
      setOneMutably(entity, state)
    }
  }
  function setAllMutably(newEntities, state) {
    newEntities = ensureEntitiesArray(newEntities)
    state.ids = []
    state.entities = {}
    addManyMutably(newEntities, state)
  }
  function removeOneMutably(key, state) {
    return removeManyMutably([key], state)
  }
  function removeManyMutably(keys, state) {
    let didMutate = false
    keys.forEach((key) => {
      if (key in state.entities) {
        delete state.entities[key]
        didMutate = true
      }
    })
    if (didMutate) {
      state.ids = state.ids.filter((id) => id in state.entities)
    }
  }
  function removeAllMutably(state) {
    Object.assign(state, {
      ids: [],
      entities: {},
    })
  }
  function takeNewKey(keys, update, state) {
    const original3 = state.entities[update.id]
    if (original3 === void 0) {
      return false
    }
    const updated = Object.assign({}, original3, update.changes)
    const newKey = selectIdValue(updated, selectId)
    const hasNewKey = newKey !== update.id
    if (hasNewKey) {
      keys[update.id] = newKey
      delete state.entities[update.id]
    }
    state.entities[newKey] = updated
    return hasNewKey
  }
  function updateOneMutably(update, state) {
    return updateManyMutably([update], state)
  }
  function updateManyMutably(updates, state) {
    const newKeys = {}
    const updatesPerEntity = {}
    updates.forEach((update) => {
      if (update.id in state.entities) {
        updatesPerEntity[update.id] = {
          id: update.id,
          // Spreads ignore falsy values, so this works even if there isn't
          // an existing update already at this key
          changes: {
            ...(updatesPerEntity[update.id] ? updatesPerEntity[update.id].changes : null),
            ...update.changes,
          },
        }
      }
    })
    updates = Object.values(updatesPerEntity)
    const didMutateEntities = updates.length > 0
    if (didMutateEntities) {
      const didMutateIds = updates.filter((update) => takeNewKey(newKeys, update, state)).length > 0
      if (didMutateIds) {
        state.ids = Object.values(state.entities).map((e) => selectIdValue(e, selectId))
      }
    }
  }
  function upsertOneMutably(entity, state) {
    return upsertManyMutably([entity], state)
  }
  function upsertManyMutably(newEntities, state) {
    const [added, updated] = splitAddedUpdatedEntities(newEntities, selectId, state)
    updateManyMutably(updated, state)
    addManyMutably(added, state)
  }
  return {
    removeAll: createSingleArgumentStateOperator(removeAllMutably),
    addOne: createStateOperator(addOneMutably),
    addMany: createStateOperator(addManyMutably),
    setOne: createStateOperator(setOneMutably),
    setMany: createStateOperator(setManyMutably),
    setAll: createStateOperator(setAllMutably),
    updateOne: createStateOperator(updateOneMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    upsertMany: createStateOperator(upsertManyMutably),
    removeOne: createStateOperator(removeOneMutably),
    removeMany: createStateOperator(removeManyMutably),
  }
}

// src/entities/sorted_state_adapter.ts
function findInsertIndex(sortedItems, item, comparisonFunction) {
  let lowIndex = 0
  let highIndex = sortedItems.length
  while (lowIndex < highIndex) {
    let middleIndex = (lowIndex + highIndex) >>> 1
    const currentItem = sortedItems[middleIndex]
    const res = comparisonFunction(item, currentItem)
    if (res >= 0) {
      lowIndex = middleIndex + 1
    } else {
      highIndex = middleIndex
    }
  }
  return lowIndex
}
function insert(sortedItems, item, comparisonFunction) {
  const insertAtIndex = findInsertIndex(sortedItems, item, comparisonFunction)
  sortedItems.splice(insertAtIndex, 0, item)
  return sortedItems
}
function createSortedStateAdapter(selectId, comparer) {
  const { removeOne, removeMany, removeAll } = createUnsortedStateAdapter(selectId)
  function addOneMutably(entity, state) {
    return addManyMutably([entity], state)
  }
  function addManyMutably(newEntities, state, existingIds) {
    newEntities = ensureEntitiesArray(newEntities)
    const existingKeys = new Set(existingIds ?? current3(state.ids))
    const models = newEntities.filter((model) => !existingKeys.has(selectIdValue(model, selectId)))
    if (models.length !== 0) {
      mergeFunction(state, models)
    }
  }
  function setOneMutably(entity, state) {
    return setManyMutably([entity], state)
  }
  function setManyMutably(newEntities, state) {
    newEntities = ensureEntitiesArray(newEntities)
    if (newEntities.length !== 0) {
      for (const item of newEntities) {
        delete state.entities[selectId(item)]
      }
      mergeFunction(state, newEntities)
    }
  }
  function setAllMutably(newEntities, state) {
    newEntities = ensureEntitiesArray(newEntities)
    state.entities = {}
    state.ids = []
    addManyMutably(newEntities, state, [])
  }
  function updateOneMutably(update, state) {
    return updateManyMutably([update], state)
  }
  function updateManyMutably(updates, state) {
    let appliedUpdates = false
    let replacedIds = false
    for (let update of updates) {
      const entity = state.entities[update.id]
      if (!entity) {
        continue
      }
      appliedUpdates = true
      Object.assign(entity, update.changes)
      const newId = selectId(entity)
      if (update.id !== newId) {
        replacedIds = true
        delete state.entities[update.id]
        const oldIndex = state.ids.indexOf(update.id)
        state.ids[oldIndex] = newId
        state.entities[newId] = entity
      }
    }
    if (appliedUpdates) {
      mergeFunction(state, [], appliedUpdates, replacedIds)
    }
  }
  function upsertOneMutably(entity, state) {
    return upsertManyMutably([entity], state)
  }
  function upsertManyMutably(newEntities, state) {
    const [added, updated, existingIdsArray] = splitAddedUpdatedEntities(newEntities, selectId, state)
    if (updated.length) {
      updateManyMutably(updated, state)
    }
    if (added.length) {
      addManyMutably(added, state, existingIdsArray)
    }
  }
  function areArraysEqual(a, b) {
    if (a.length !== b.length) {
      return false
    }
    for (let i = 0; i < a.length && i < b.length; i++) {
      if (a[i] === b[i]) {
        continue
      }
      return false
    }
    return true
  }
  const mergeInsertion = (state, addedItems, appliedUpdates, replacedIds) => {
    const currentEntities = getCurrent(state.entities)
    const currentIds = getCurrent(state.ids)
    const stateEntities = state.entities
    let ids = currentIds
    if (replacedIds) {
      ids = Array.from(new Set(currentIds))
    }
    let sortedEntities = []
    for (const id of ids) {
      const entity = currentEntities[id]
      if (entity) {
        sortedEntities.push(entity)
      }
    }
    const wasPreviouslyEmpty = sortedEntities.length === 0
    for (const item of addedItems) {
      stateEntities[selectId(item)] = item
      if (!wasPreviouslyEmpty) {
        insert(sortedEntities, item, comparer)
      }
    }
    if (wasPreviouslyEmpty) {
      sortedEntities = addedItems.slice().sort(comparer)
    } else if (appliedUpdates) {
      sortedEntities.sort(comparer)
    }
    const newSortedIds = sortedEntities.map(selectId)
    if (!areArraysEqual(currentIds, newSortedIds)) {
      state.ids = newSortedIds
    }
  }
  const mergeFunction = mergeInsertion
  return {
    removeOne,
    removeMany,
    removeAll,
    addOne: createStateOperator(addOneMutably),
    updateOne: createStateOperator(updateOneMutably),
    upsertOne: createStateOperator(upsertOneMutably),
    setOne: createStateOperator(setOneMutably),
    setMany: createStateOperator(setManyMutably),
    setAll: createStateOperator(setAllMutably),
    addMany: createStateOperator(addManyMutably),
    updateMany: createStateOperator(updateManyMutably),
    upsertMany: createStateOperator(upsertManyMutably),
  }
}

// src/entities/create_adapter.ts
function createEntityAdapter(options = {}) {
  const { selectId, sortComparer } = {
    sortComparer: false,
    selectId: (instance) => instance.id,
    ...options,
  }
  const stateAdapter = sortComparer
    ? createSortedStateAdapter(selectId, sortComparer)
    : createUnsortedStateAdapter(selectId)
  const stateFactory = createInitialStateFactory(stateAdapter)
  const selectorsFactory = createSelectorsFactory()
  return {
    selectId,
    sortComparer,
    ...stateFactory,
    ...selectorsFactory,
    ...stateAdapter,
  }
}

export { createEntityAdapter }
