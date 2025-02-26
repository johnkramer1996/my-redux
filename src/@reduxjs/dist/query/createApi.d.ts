import type { Api, Module, ModuleName } from './apiTypes';
import type { CombinedState } from './core/apiState';
import type { BaseQueryArg, BaseQueryFn } from './baseQueryTypes';
import type { SerializeQueryArgs } from './defaultSerializeQueryArgs';
import type { EndpointBuilder, EndpointDefinitions } from './endpointDefinitions';
import type { UnknownAction } from '@reduxjs/toolkit';
import type { NoInfer } from './tsHelpers';
export interface CreateApiOptions<BaseQuery extends BaseQueryFn, Definitions extends EndpointDefinitions, ReducerPath extends string = 'api', TagTypes extends string = never> {
    /**
     * The base query used by each endpoint if no `queryFn` option is specified. RTK Query exports a utility called [fetchBaseQuery](./fetchBaseQuery) as a lightweight wrapper around `fetch` for common use-cases. See [Customizing Queries](../../rtk-query/usage/customizing-queries) if `fetchBaseQuery` does not handle your requirements.
     *
     * @example
     *
     * ```ts
     * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
     *
     * const api = createApi({
     *   // highlight-start
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   // highlight-end
     *   endpoints: (build) => ({
     *     // ...endpoints
     *   }),
     * })
     * ```
     */
    baseQuery: BaseQuery;
    /**
     * An array of string tag type names. Specifying tag types is optional, but you should define them so that they can be used for caching and invalidation. When defining a tag type, you will be able to [provide](../../rtk-query/usage/automated-refetching#providing-tags) them with `providesTags` and [invalidate](../../rtk-query/usage/automated-refetching#invalidating-tags) them with `invalidatesTags` when configuring [endpoints](#endpoints).
     *
     * @example
     *
     * ```ts
     * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query'
     *
     * const api = createApi({
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   // highlight-start
     *   tagTypes: ['Post', 'User'],
     *   // highlight-end
     *   endpoints: (build) => ({
     *     // ...endpoints
     *   }),
     * })
     * ```
     */
    tagTypes?: readonly TagTypes[];
    /**
     * The `reducerPath` is a _unique_ key that your service will be mounted to in your store. If you call `createApi` more than once in your application, you will need to provide a unique value each time. Defaults to `'api'`.
     *
     * @example
     *
     * ```ts
     * // codeblock-meta title="apis.js"
     * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query';
     *
     * const apiOne = createApi({
     *   // highlight-start
     *   reducerPath: 'apiOne',
     *   // highlight-end
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   endpoints: (builder) => ({
     *     // ...endpoints
     *   }),
     * });
     *
     * const apiTwo = createApi({
     *   // highlight-start
     *   reducerPath: 'apiTwo',
     *   // highlight-end
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   endpoints: (builder) => ({
     *     // ...endpoints
     *   }),
     * });
     * ```
     */
    reducerPath?: ReducerPath;
    /**
     * Accepts a custom function if you have a need to change the creation of cache keys for any reason.
     */
    serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
    /**
     * Endpoints are just a set of operations that you want to perform against your server. You define them as an object using the builder syntax. There are two basic endpoint types: [`query`](../../rtk-query/usage/queries) and [`mutation`](../../rtk-query/usage/mutations).
     */
    endpoints(build: EndpointBuilder<BaseQuery, TagTypes, ReducerPath>): Definitions;
    /**
     * Defaults to `60` _(this value is in seconds)_. This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
     *
     * ```ts
     * // codeblock-meta title="keepUnusedDataFor example"
     *
     * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
     * interface Post {
     *   id: number
     *   name: string
     * }
     * type PostsResponse = Post[]
     *
     * const api = createApi({
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   endpoints: (build) => ({
     *     getPosts: build.query<PostsResponse, void>({
     *       query: () => 'posts',
     *       // highlight-start
     *       keepUnusedDataFor: 5
     *       // highlight-end
     *     })
     *   })
     * })
     * ```
     */
    keepUnusedDataFor?: number;
    /**
     * Defaults to `false`. This setting allows you to control whether if a cached result is already available RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.
     * - `false` - Will not cause a query to be performed _unless_ it does not exist yet.
     * - `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
     * - `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.
     *
     * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
     */
    refetchOnMountOrArgChange?: boolean | number;
    /**
     * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.
     *
     * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
     *
     * Note: requires [`setupListeners`](./setupListeners) to have been called.
     */
    refetchOnFocus?: boolean;
    /**
     * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.
     *
     * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
     *
     * Note: requires [`setupListeners`](./setupListeners) to have been called.
     */
    refetchOnReconnect?: boolean;
    /**
     * Defaults to `'immediately'`. This setting allows you to control when tags are invalidated after a mutation.
     *
     * - `'immediately'`: Queries are invalidated instantly after the mutation finished, even if they are running.
     *   If the query provides tags that were invalidated while it ran, it won't be re-fetched.
     * - `'delayed'`: Invalidation only happens after all queries and mutations are settled.
     *   This ensures that queries are always invalidated correctly and automatically "batches" invalidations of concurrent mutations.
     *   Note that if you constantly have some queries (or mutations) running, this can delay tag invalidations indefinitely.
     */
    invalidationBehavior?: 'delayed' | 'immediately';
    /**
     * A function that is passed every dispatched action. If this returns something other than `undefined`,
     * that return value will be used to rehydrate fulfilled & errored queries.
     *
     * @example
     *
     * ```ts
     * // codeblock-meta title="next-redux-wrapper rehydration example"
     * import type { Action, PayloadAction } from '@reduxjs/toolkit'
     * import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
     * import { HYDRATE } from 'next-redux-wrapper'
     *
     * type RootState = any; // normally inferred from state
     *
     * function isHydrateAction(action: Action): action is PayloadAction<RootState> {
     *   return action.type === HYDRATE
     * }
     *
     * export const api = createApi({
     *   baseQuery: fetchBaseQuery({ baseUrl: '/' }),
     *   // highlight-start
     *   extractRehydrationInfo(action, { reducerPath }): any {
     *     if (isHydrateAction(action)) {
     *       return action.payload[reducerPath]
     *     }
     *   },
     *   // highlight-end
     *   endpoints: (build) => ({
     *     // omitted
     *   }),
     * })
     * ```
     */
    extractRehydrationInfo?: (action: UnknownAction, { reducerPath, }: {
        reducerPath: ReducerPath;
    }) => undefined | CombinedState<NoInfer<Definitions>, NoInfer<TagTypes>, NoInfer<ReducerPath>>;
}
export type CreateApi<Modules extends ModuleName> = {
    /**
     * Creates a service to use in your application. Contains only the basic redux logic (the core module).
     *
     * @link https://rtk-query-docs.netlify.app/api/createApi
     */
    <BaseQuery extends BaseQueryFn, Definitions extends EndpointDefinitions, ReducerPath extends string = 'api', TagTypes extends string = never>(options: CreateApiOptions<BaseQuery, Definitions, ReducerPath, TagTypes>): Api<BaseQuery, Definitions, ReducerPath, TagTypes, Modules>;
};
/**
 * Builds a `createApi` method based on the provided `modules`.
 *
 * @link https://rtk-query-docs.netlify.app/concepts/customizing-create-api
 *
 * @example
 * ```ts
 * const MyContext = React.createContext<ReactReduxContextValue | null>(null);
 * const customCreateApi = buildCreateApi(
 *   coreModule(),
 *   reactHooksModule({
 *     hooks: {
 *       useDispatch: createDispatchHook(MyContext),
 *       useSelector: createSelectorHook(MyContext),
 *       useStore: createStoreHook(MyContext)
 *     }
 *   })
 * );
 * ```
 *
 * @param modules - A variable number of modules that customize how the `createApi` method handles endpoints
 * @returns A `createApi` method using the provided `modules`.
 */
export declare function buildCreateApi<Modules extends [Module<any>, ...Module<any>[]]>(...modules: Modules): CreateApi<Modules[number]['name']>;
