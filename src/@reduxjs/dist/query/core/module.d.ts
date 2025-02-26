/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import type { PatchQueryDataThunk, UpdateQueryDataThunk, UpsertQueryDataThunk } from './buildThunks';
import './buildThunks';
import type { ActionCreatorWithPayload, Middleware, Reducer, ThunkAction, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import type { EndpointDefinitions, QueryArgFrom, QueryDefinition, MutationDefinition, TagDescription } from '../endpointDefinitions';
import type { CombinedState, QueryKeys, MutationKeys, RootState } from './apiState';
import type { Module } from '../apiTypes';
import { onFocus, onFocusLost, onOnline, onOffline } from './setupListeners';
import './buildSelectors';
import type { MutationActionCreatorResult, QueryActionCreatorResult } from './buildInitiate';
import './buildInitiate';
import type { SliceActions } from './buildSlice';
import type { BaseQueryFn } from '../baseQueryTypes';
import type { ReferenceCacheLifecycle } from './buildMiddleware/cacheLifecycle';
import type { ReferenceQueryLifecycle } from './buildMiddleware/queryLifecycle';
import type { ReferenceCacheCollection } from './buildMiddleware/cacheCollection';
import { createSelector as _createSelector } from './rtkImports';
/**
 * `ifOlderThan` - (default: `false` | `number`) - _number is value in seconds_
 * - If specified, it will only run the query if the difference between `new Date()` and the last `fulfilledTimeStamp` is greater than the given value
 *
 * @overloadSummary
 * `force`
 * - If `force: true`, it will ignore the `ifOlderThan` value if it is set and the query will be run even if it exists in the cache.
 */
export type PrefetchOptions = {
    ifOlderThan?: false | number;
} | {
    force?: boolean;
};
export declare const coreModuleName: unique symbol;
export type CoreModule = typeof coreModuleName | ReferenceCacheLifecycle | ReferenceQueryLifecycle | ReferenceCacheCollection;
export interface ThunkWithReturnValue<T> extends ThunkAction<T, any, any, UnknownAction> {
}
declare module '../apiTypes' {
    interface ApiModules<BaseQuery extends BaseQueryFn, Definitions extends EndpointDefinitions, ReducerPath extends string, TagTypes extends string> {
        [coreModuleName]: {
            /**
             * This api's reducer should be mounted at `store[api.reducerPath]`.
             *
             * @example
             * ```ts
             * configureStore({
             *   reducer: {
             *     [api.reducerPath]: api.reducer,
             *   },
             *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
             * })
             * ```
             */
            reducerPath: ReducerPath;
            /**
             * Internal actions not part of the public API. Note: These are subject to change at any given time.
             */
            internalActions: InternalActions;
            /**
             *  A standard redux reducer that enables core functionality. Make sure it's included in your store.
             *
             * @example
             * ```ts
             * configureStore({
             *   reducer: {
             *     [api.reducerPath]: api.reducer,
             *   },
             *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
             * })
             * ```
             */
            reducer: Reducer<CombinedState<Definitions, TagTypes, ReducerPath>, UnknownAction>;
            /**
             * This is a standard redux middleware and is responsible for things like polling, garbage collection and a handful of other things. Make sure it's included in your store.
             *
             * @example
             * ```ts
             * configureStore({
             *   reducer: {
             *     [api.reducerPath]: api.reducer,
             *   },
             *   middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
             * })
             * ```
             */
            middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, UnknownAction>>;
            /**
             * A collection of utility thunks for various situations.
             */
            util: {
                /**
                 * A thunk that (if dispatched) will return a specific running query, identified
                 * by `endpointName` and `args`.
                 * If that query is not running, dispatching the thunk will result in `undefined`.
                 *
                 * Can be used to await a specific query triggered in any way,
                 * including via hook calls or manually dispatching `initiate` actions.
                 *
                 * See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for details.
                 */
                getRunningQueryThunk<EndpointName extends QueryKeys<Definitions>>(endpointName: EndpointName, args: QueryArgFrom<Definitions[EndpointName]>): ThunkWithReturnValue<QueryActionCreatorResult<Definitions[EndpointName] & {
                    type: 'query';
                }> | undefined>;
                /**
                 * A thunk that (if dispatched) will return a specific running mutation, identified
                 * by `endpointName` and `fixedCacheKey` or `requestId`.
                 * If that mutation is not running, dispatching the thunk will result in `undefined`.
                 *
                 * Can be used to await a specific mutation triggered in any way,
                 * including via hook trigger functions or manually dispatching `initiate` actions.
                 *
                 * See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for details.
                 */
                getRunningMutationThunk<EndpointName extends MutationKeys<Definitions>>(endpointName: EndpointName, fixedCacheKeyOrRequestId: string): ThunkWithReturnValue<MutationActionCreatorResult<Definitions[EndpointName] & {
                    type: 'mutation';
                }> | undefined>;
                /**
                 * A thunk that (if dispatched) will return all running queries.
                 *
                 * Useful for SSR scenarios to await all running queries triggered in any way,
                 * including via hook calls or manually dispatching `initiate` actions.
                 *
                 * See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for details.
                 */
                getRunningQueriesThunk(): ThunkWithReturnValue<Array<QueryActionCreatorResult<any>>>;
                /**
                 * A thunk that (if dispatched) will return all running mutations.
                 *
                 * Useful for SSR scenarios to await all running mutations triggered in any way,
                 * including via hook calls or manually dispatching `initiate` actions.
                 *
                 * See https://redux-toolkit.js.org/rtk-query/usage/server-side-rendering for details.
                 */
                getRunningMutationsThunk(): ThunkWithReturnValue<Array<MutationActionCreatorResult<any>>>;
                /**
                 * A Redux thunk that can be used to manually trigger pre-fetching of data.
                 *
                 * The thunk accepts three arguments: the name of the endpoint we are updating (such as `'getPost'`), the appropriate query arg values to construct the desired cache key, and a set of options used to determine if the data actually should be re-fetched based on cache staleness.
                 *
                 * React Hooks users will most likely never need to use this directly, as the `usePrefetch` hook will dispatch this thunk internally as needed when you call the prefetching function supplied by the hook.
                 *
                 * @example
                 *
                 * ```ts no-transpile
                 * dispatch(api.util.prefetch('getPosts', undefined, { force: true }))
                 * ```
                 */
                prefetch<EndpointName extends QueryKeys<Definitions>>(endpointName: EndpointName, arg: QueryArgFrom<Definitions[EndpointName]>, options: PrefetchOptions): ThunkAction<void, any, any, UnknownAction>;
                /**
                 * A Redux thunk action creator that, when dispatched, creates and applies a set of JSON diff/patch objects to the current state. This immediately updates the Redux state with those changes.
                 *
                 * The thunk action creator accepts three arguments: the name of the endpoint we are updating (such as `'getPost'`), the appropriate query arg values to construct the desired cache key, and an `updateRecipe` callback function. The callback receives an Immer-wrapped `draft` of the current state, and may modify the draft to match the expected results after the mutation completes successfully.
                 *
                 * The thunk executes _synchronously_, and returns an object containing `{patches: Patch[], inversePatches: Patch[], undo: () => void}`. The `patches` and `inversePatches` are generated using Immer's [`produceWithPatches` method](https://immerjs.github.io/immer/patches).
                 *
                 * This is typically used as the first step in implementing optimistic updates. The generated `inversePatches` can be used to revert the updates by calling `dispatch(patchQueryData(endpointName, args, inversePatches))`. Alternatively, the `undo` method can be called directly to achieve the same effect.
                 *
                 * Note that the first two arguments (`endpointName` and `args`) are used to determine which existing cache entry to update. If no existing cache entry is found, the `updateRecipe` callback will not run.
                 *
                 * @example
                 *
                 * ```ts
                 * const patchCollection = dispatch(
                 *   api.util.updateQueryData('getPosts', undefined, (draftPosts) => {
                 *     draftPosts.push({ id: 1, name: 'Teddy' })
                 *   })
                 * )
                 * ```
                 */
                updateQueryData: UpdateQueryDataThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
                /**
                 * A Redux thunk action creator that, when dispatched, acts as an artificial API request to upsert a value into the cache.
                 *
                 * The thunk action creator accepts three arguments: the name of the endpoint we are updating (such as `'getPost'`), the appropriate query arg values to construct the desired cache key, and the data to upsert.
                 *
                 * If no cache entry for that cache key exists, a cache entry will be created and the data added. If a cache entry already exists, this will _overwrite_ the existing cache entry data.
                 *
                 * The thunk executes _asynchronously_, and returns a promise that resolves when the store has been updated.
                 *
                 * If dispatched while an actual request is in progress, both the upsert and request will be handled as soon as they resolve, resulting in a "last result wins" update behavior.
                 *
                 * @example
                 *
                 * ```ts
                 * await dispatch(
                 *   api.util.upsertQueryData('getPost', {id: 1}, {id: 1, text: "Hello!"})
                 * )
                 * ```
                 */
                upsertQueryData: UpsertQueryDataThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
                /**
                 * A Redux thunk that applies a JSON diff/patch array to the cached data for a given query result. This immediately updates the Redux state with those changes.
                 *
                 * The thunk accepts three arguments: the name of the endpoint we are updating (such as `'getPost'`), the appropriate query arg values to construct the desired cache key, and a JSON diff/patch array as produced by Immer's `produceWithPatches`.
                 *
                 * This is typically used as the second step in implementing optimistic updates. If a request fails, the optimistically-applied changes can be reverted by dispatching `patchQueryData` with the `inversePatches` that were generated by `updateQueryData` earlier.
                 *
                 * In cases where it is desired to simply revert the previous changes, it may be preferable to call the `undo` method returned from dispatching `updateQueryData` instead.
                 *
                 * @example
                 * ```ts
                 * const patchCollection = dispatch(
                 *   api.util.updateQueryData('getPosts', undefined, (draftPosts) => {
                 *     draftPosts.push({ id: 1, name: 'Teddy' })
                 *   })
                 * )
                 *
                 * // later
                 * dispatch(
                 *   api.util.patchQueryData('getPosts', undefined, patchCollection.inversePatches)
                 * )
                 *
                 * // or
                 * patchCollection.undo()
                 * ```
                 */
                patchQueryData: PatchQueryDataThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
                /**
                 * A Redux action creator that can be dispatched to manually reset the api state completely. This will immediately remove all existing cache entries, and all queries will be considered 'uninitialized'.
                 *
                 * @example
                 *
                 * ```ts
                 * dispatch(api.util.resetApiState())
                 * ```
                 */
                resetApiState: SliceActions['resetApiState'];
                /**
                 * A Redux action creator that can be used to manually invalidate cache tags for [automated re-fetching](../../usage/automated-refetching.mdx).
                 *
                 * The action creator accepts one argument: the cache tags to be invalidated. It returns an action with those tags as a payload, and the corresponding `invalidateTags` action type for the api.
                 *
                 * Dispatching the result of this action creator will [invalidate](../../usage/automated-refetching.mdx#invalidating-cache-data) the given tags, causing queries to automatically re-fetch if they are subscribed to cache data that [provides](../../usage/automated-refetching.mdx#providing-cache-data) the corresponding tags.
                 *
                 * The array of tags provided to the action creator should be in one of the following formats, where `TagType` is equal to a string provided to the [`tagTypes`](../createApi.mdx#tagtypes) property of the api:
                 *
                 * - `[TagType]`
                 * - `[{ type: TagType }]`
                 * - `[{ type: TagType, id: number | string }]`
                 *
                 * @example
                 *
                 * ```ts
                 * dispatch(api.util.invalidateTags(['Post']))
                 * dispatch(api.util.invalidateTags([{ type: 'Post', id: 1 }]))
                 * dispatch(
                 *   api.util.invalidateTags([
                 *     { type: 'Post', id: 1 },
                 *     { type: 'Post', id: 'LIST' },
                 *   ])
                 * )
                 * ```
                 */
                invalidateTags: ActionCreatorWithPayload<Array<TagDescription<TagTypes>>, string>;
                /**
                 * A function to select all `{ endpointName, originalArgs, queryCacheKey }` combinations that would be invalidated by a specific set of tags.
                 *
                 * Can be used for mutations that want to do optimistic updates instead of invalidating a set of tags, but don't know exactly what they need to update.
                 */
                selectInvalidatedBy: (state: RootState<Definitions, string, ReducerPath>, tags: ReadonlyArray<TagDescription<TagTypes>>) => Array<{
                    endpointName: string;
                    originalArgs: any;
                    queryCacheKey: string;
                }>;
                /**
                 * A function to select all arguments currently cached for a given endpoint.
                 *
                 * Can be used for mutations that want to do optimistic updates instead of invalidating a set of tags, but don't know exactly what they need to update.
                 */
                selectCachedArgsForQuery: <QueryName extends QueryKeys<Definitions>>(state: RootState<Definitions, string, ReducerPath>, queryName: QueryName) => Array<QueryArgFrom<Definitions[QueryName]>>;
            };
            /**
             * Endpoints based on the input endpoints provided to `createApi`, containing `select` and `action matchers`.
             */
            endpoints: {
                [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any, any> ? ApiEndpointQuery<Definitions[K], Definitions> : Definitions[K] extends MutationDefinition<any, any, any, any, any> ? ApiEndpointMutation<Definitions[K], Definitions> : never;
            };
        };
    }
}
export interface ApiEndpointQuery<Definition extends QueryDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
    name: string;
    /**
     * All of these are `undefined` at runtime, purely to be used in TypeScript declarations!
     */
    Types: NonNullable<Definition['Types']>;
}
export interface ApiEndpointMutation<Definition extends MutationDefinition<any, any, any, any, any>, Definitions extends EndpointDefinitions> {
    name: string;
    /**
     * All of these are `undefined` at runtime, purely to be used in TypeScript declarations!
     */
    Types: NonNullable<Definition['Types']>;
}
export type ListenerActions = {
    /**
     * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
     * @link https://rtk-query-docs.netlify.app/api/setupListeners
     */
    onOnline: typeof onOnline;
    onOffline: typeof onOffline;
    /**
     * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
     * @link https://rtk-query-docs.netlify.app/api/setupListeners
     */
    onFocus: typeof onFocus;
    onFocusLost: typeof onFocusLost;
};
export type InternalActions = SliceActions & ListenerActions;
export interface CoreModuleOptions {
    /**
     * A selector creator (usually from `reselect`, or matching the same signature)
     */
    createSelector?: typeof _createSelector;
}
/**
 * Creates a module containing the basic redux logic for use with `buildCreateApi`.
 *
 * @example
 * ```ts
 * const createBaseApi = buildCreateApi(coreModule());
 * ```
 */
export declare const coreModule: ({ createSelector, }?: CoreModuleOptions) => Module<CoreModule>;
