// import { Dispatch, UnknownAction } from 'redux'
// import { ThunkDispatch } from 'redux-thunk'
// import { RootState, AppDispatch, increment } from './store'
// import { ActionCreatorWithPreparedPayload } from '@reduxjs/toolkit'
// import { FallbackIfUnknown, IsUnknown } from './@reduxjs/ts/tsHelpers'

// export type IsAny<T, True, False = never> =
//   // test if we are going the left AND right path in the condition
//   true | false extends (T extends never ? true : false) ? True : False

// export type SafePromise<T> = Promise<T> & {
//   __linterBrands: 'SafePromise'
// }

// export type BaseThunkAPI<
//   S,
//   E,
//   D extends Dispatch = Dispatch,
//   RejectedValue = unknown,
//   RejectedMeta = unknown,
//   FulfilledMeta = unknown,
// > = {
//   dispatch: D
//   getState: () => S
//   extra: E
//   requestId: string
//   signal: AbortSignal
//   abort: (reason?: string) => void
//   rejectWithValue: IsUnknown<
//     RejectedMeta,
//     (value: RejectedValue) => RejectWithValue<RejectedValue, RejectedMeta>,
//     (value: RejectedValue, meta: RejectedMeta) => RejectWithValue<RejectedValue, RejectedMeta>
//   >
//   fulfillWithValue: IsUnknown<
//     FulfilledMeta,
//     <FulfilledValue>(value: FulfilledValue) => FulfilledValue,
//     <FulfilledValue>(value: FulfilledValue, meta: FulfilledMeta) => FulfillWithMeta<FulfilledValue, FulfilledMeta>
//   >
// }

// export type AsyncThunkConfig = {
//   state?: unknown
//   dispatch?: ThunkDispatch<unknown, unknown, UnknownAction>
//   extra?: unknown
//   rejectValue?: unknown
//   serializedErrorType?: unknown
//   pendingMeta?: unknown
//   fulfilledMeta?: unknown
//   rejectedMeta?: unknown
// }

// type GetState<ThunkApiConfig> = ThunkApiConfig extends {
//   state: infer State
// }
//   ? State
//   : unknown
// type GetExtra<ThunkApiConfig> = ThunkApiConfig extends { extra: infer Extra } ? Extra : unknown

// type GetDispatch<ThunkApiConfig> = ThunkApiConfig extends {
//   dispatch: infer Dispatch
// }
//   ? FallbackIfUnknown<Dispatch, ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, UnknownAction>>
//   : ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, UnknownAction>

// export type GetThunkAPI<ThunkApiConfig> = BaseThunkAPI<
//   GetState<ThunkApiConfig>,
//   GetExtra<ThunkApiConfig>,
//   GetDispatch<ThunkApiConfig>,
//   GetRejectValue<ThunkApiConfig>,
//   GetRejectedMeta<ThunkApiConfig>,
//   GetFulfilledMeta<ThunkApiConfig>
// >

// type GetRejectValue<ThunkApiConfig> = ThunkApiConfig extends {
//   rejectValue: infer RejectValue
// }
//   ? RejectValue
//   : unknown

// type GetPendingMeta<ThunkApiConfig> = ThunkApiConfig extends {
//   pendingMeta: infer PendingMeta
// }
//   ? PendingMeta
//   : unknown

// type GetFulfilledMeta<ThunkApiConfig> = ThunkApiConfig extends {
//   fulfilledMeta: infer FulfilledMeta
// }
//   ? FulfilledMeta
//   : unknown

// type GetRejectedMeta<ThunkApiConfig> = ThunkApiConfig extends {
//   rejectedMeta: infer RejectedMeta
// }
//   ? RejectedMeta
//   : unknown

// type GetSerializedErrorType<ThunkApiConfig> = ThunkApiConfig extends {
//   serializedErrorType: infer GetSerializedErrorType
// }
//   ? GetSerializedErrorType
//   : SerializedError

// export interface SerializedError {
//   name?: string
//   message?: string
//   stack?: string
//   code?: string
// }

// class RejectWithValue<Payload, RejectedMeta> {
//   /*
//     type-only property to distinguish between RejectWithValue and FulfillWithMeta
//     does not exist at runtime
//     */
//   private readonly _type!: 'RejectWithValue'
//   constructor(public readonly payload: Payload, public readonly meta: RejectedMeta) {}
// }

// class FulfillWithMeta<Payload, FulfilledMeta> {
//   /*
//     type-only property to distinguish between RejectWithValue and FulfillWithMeta
//     does not exist at runtime
//     */
//   private readonly _type!: 'FulfillWithMeta'
//   constructor(public readonly payload: Payload, public readonly meta: FulfilledMeta) {}
// }

// type MaybePromise<T> = T | Promise<T> | (T extends any ? Promise<T> : never)

// export type AsyncThunkPayloadCreator<Returned, ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = (
//   arg: ThunkArg,
//   thunkAPI: GetThunkAPI<ThunkApiConfig>,
// ) => AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig>

// export type AsyncThunkPayloadCreatorReturnValue<Returned, ThunkApiConfig extends AsyncThunkConfig> = MaybePromise<
//   | IsUnknown<GetFulfilledMeta<ThunkApiConfig>, Returned, FulfillWithMeta<Returned, GetFulfilledMeta<ThunkApiConfig>>>
//   | RejectWithValue<GetRejectValue<ThunkApiConfig>, GetRejectedMeta<ThunkApiConfig>>
// >

// export type AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = (
//   dispatch: NonNullable<GetDispatch<ThunkApiConfig>>,
//   getState: () => GetState<ThunkApiConfig>,
//   extra: GetExtra<ThunkApiConfig>,
// ) => SafePromise<
//   | ReturnType<AsyncThunkFulfilledActionCreator<Returned, ThunkArg>>
//   | ReturnType<AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>>
// > & {
//   abort: (reason?: string) => void
//   requestId: string
//   arg: ThunkArg
//   unwrap: () => Promise<Returned>
// }

// type AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = IsAny<
//   ThunkArg,
//   // any handling
//   (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
//   // unknown handling
//   unknown extends ThunkArg
//     ? (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument not specified or specified as void or undefined
//     : [ThunkArg] extends [void] | [undefined]
//     ? () => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains void
//     : [void] extends [ThunkArg] // make optional
//     ? (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains undefined
//     : [undefined] extends [ThunkArg]
//     ? WithStrictNullChecks<
//         // with strict nullChecks: make optional
//         (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
//         // without strict null checks this will match everything, so don't make it optional
//         (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
//       > // default case: normal argument
//     : (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
// >

// export type AsyncThunk<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = AsyncThunkActionCreator<
//   Returned,
//   ThunkArg,
//   ThunkApiConfig
// > & {
//   pending: AsyncThunkPendingActionCreator<ThunkArg, ThunkApiConfig>
//   rejected: AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>
//   fulfilled: AsyncThunkFulfilledActionCreator<Returned, ThunkArg, ThunkApiConfig>
//   //   matchSettled?
//   settled: (
//     action: any,
//   ) => action is ReturnType<
//     | AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig>
//     | AsyncThunkFulfilledActionCreator<Returned, ThunkArg, ThunkApiConfig>
//   >
//   typePrefix: string
// }

// export type OverrideThunkApiConfigs<OldConfig, NewConfig> = NewConfig & Omit<OldConfig, keyof NewConfig>

// export type AsyncThunkOptions<ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = {
//   condition?(
//     arg: ThunkArg,
//     api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>,
//   ): MaybePromise<boolean | undefined>
//   dispatchConditionRejection?: boolean
//   serializeError?: (x: unknown) => GetSerializedErrorType<ThunkApiConfig>
//   idGenerator?: (arg: ThunkArg) => string
// } & IsUnknown<
//   GetPendingMeta<ThunkApiConfig>,
//   {
//     getPendingMeta?(
//       base: {
//         arg: ThunkArg
//         requestId: string
//       },
//       api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>,
//     ): GetPendingMeta<ThunkApiConfig>
//   },
//   {
//     getPendingMeta(
//       base: {
//         arg: ThunkArg
//         requestId: string
//       },
//       api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>,
//     ): GetPendingMeta<ThunkApiConfig>
//   }
// >

// export type AsyncThunkPendingActionCreator<ThunkArg, ThunkApiConfig = {}> = ActionCreatorWithPreparedPayload<
//   [string, ThunkArg, GetPendingMeta<ThunkApiConfig>?],
//   undefined,
//   string,
//   never,
//   {
//     arg: ThunkArg
//     requestId: string
//     requestStatus: 'pending'
//   } & GetPendingMeta<ThunkApiConfig>
// >

// export type AsyncThunkRejectedActionCreator<ThunkArg, ThunkApiConfig = {}> = ActionCreatorWithPreparedPayload<
//   [Error | null, string, ThunkArg, GetRejectValue<ThunkApiConfig>?, GetRejectedMeta<ThunkApiConfig>?],
//   GetRejectValue<ThunkApiConfig> | undefined,
//   string,
//   GetSerializedErrorType<ThunkApiConfig>,
//   {
//     arg: ThunkArg
//     requestId: string
//     requestStatus: 'rejected'
//     aborted: boolean
//     condition: boolean
//   } & (
//     | ({ rejectedWithValue: false } & {
//         [K in keyof GetRejectedMeta<ThunkApiConfig>]?: undefined
//       })
//     | ({ rejectedWithValue: true } & GetRejectedMeta<ThunkApiConfig>)
//   )
// >

// export type AsyncThunkFulfilledActionCreator<
//   Returned,
//   ThunkArg,
//   ThunkApiConfig = {},
// > = ActionCreatorWithPreparedPayload<
//   [Returned, string, ThunkArg, GetFulfilledMeta<ThunkApiConfig>?],
//   Returned,
//   string,
//   never,
//   {
//     arg: ThunkArg
//     requestId: string
//     requestStatus: 'fulfilled'
//   } & GetFulfilledMeta<ThunkApiConfig>
// >

// type CreateAsyncThunk<CurriedThunkApiConfig extends AsyncThunkConfig> = {
//   <Returned, ThunkArg = void>(
//     typePrefix: string,
//     payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, CurriedThunkApiConfig>,
//     options?: AsyncThunkOptions<ThunkArg, CurriedThunkApiConfig>,
//   ): AsyncThunk<Returned, ThunkArg, CurriedThunkApiConfig>

//   <Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig>(
//     typePrefix: string,
//     payloadCreator: AsyncThunkPayloadCreator<
//       Returned,
//       ThunkArg,
//       OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
//     >,
//     options?: AsyncThunkOptions<ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>,
//   ): AsyncThunk<Returned, ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>

//   withTypes<ThunkApiConfig extends AsyncThunkConfig>(): CreateAsyncThunk<
//     OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
//   >
// }

// declare const createAsyncThunk: CreateAsyncThunk<AsyncThunkConfig>

// type WithStrictNullChecks<True, False> = undefined extends boolean ? False : True

// const thunkCreator: AsyncThunkPayloadCreator<
//   void,
//   void,
//   {
//     state: RootState
//   }
// > = (_, thunkApi) => {
//   thunkApi.dispatch(increment())
// }

// export const thunk = createAsyncThunk<void, void, {}>('thunk', thunkCreator)
