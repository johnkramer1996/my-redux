import { Dispatch, UnknownAction } from 'redux'
import { ThunkDispatch } from 'redux-thunk'
import { ActionCreatorWithPreparedPayload, createAction } from '@reduxjs/toolkit'
import { FallbackIfUnknown } from './tsHelpers'
import { AppDispatch, increment } from '../store'

// BaseThunkAPI
// AsyncThunkConfig
// GetState
// GetExtra
// GetDispatch
// GetThunkAPI
// AsyncThunk - все, что возвращает createAsyncThunk
// AsyncThunkActionCreator - акшен креатор, что отдает функція thunk прі созданіі
// AsyncThunkAction - сам екшен
// AsyncThunkPayloadCreator - функція пользователя
// OverrideThunkApiConfigs - сам екшен
// AsyncThunkFulfilledActionCreator - сам екшен, обічніе екшен, можно сказать что сінхроній, уц которого есть payload

// AsyncThunk=AsyncThunkActionCreator+AsyncThunkFulfilledActionCreator -> AsyncThunkAction -> AsyncThunkPayloadCreator

export type IsAny<T, True, False = never> = true | false extends (T extends never ? true : false) ? True : False

export type BaseThunkAPI<S, E, D extends Dispatch = Dispatch> = {
  dispatch: D
  getState: () => S
  extra: E
  requestId: string
}

export type AsyncThunkConfig = {
  state?: unknown
  dispatch?: ThunkDispatch<unknown, unknown, UnknownAction>
  extra?: unknown
}

type GetState<ThunkApiConfig> = ThunkApiConfig extends {
  state: infer State
}
  ? State
  : unknown
type GetExtra<ThunkApiConfig> = ThunkApiConfig extends { extra: infer Extra } ? Extra : unknown

type GetDispatch<ThunkApiConfig> = ThunkApiConfig extends {
  dispatch: infer Dispatch
}
  ? FallbackIfUnknown<Dispatch, DefaultDispatch<ThunkApiConfig>>
  : DefaultDispatch<ThunkApiConfig>

type DefaultDispatch<ThunkApiConfig> = ThunkDispatch<GetState<ThunkApiConfig>, GetExtra<ThunkApiConfig>, UnknownAction>

export type GetThunkAPI<ThunkApiConfig> = BaseThunkAPI<
  GetState<ThunkApiConfig>,
  GetExtra<ThunkApiConfig>,
  GetDispatch<ThunkApiConfig>
>

type MaybePromise<T> = T | Promise<T> | (T extends any ? Promise<T> : never)

export type AsyncThunkPayloadCreator<Returned, ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = (
  arg: ThunkArg,
  thunkAPI: GetThunkAPI<ThunkApiConfig>,
) => MaybePromise<Returned>

type AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = IsAny<
  ThunkArg,
  (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
  // unknown handling
  unknown extends ThunkArg
    ? (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
    : [ThunkArg] extends [void] | [undefined]
    ? () => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains void
    : [void] extends [ThunkArg] // make optional
    ? (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> // argument contains undefined
    : [undefined] extends [ThunkArg]
    ? WithStrictNullChecks<
        (arg?: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>,
        (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
      >
    : (arg: ThunkArg) => AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig>
>

export type AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = (
  dispatch: NonNullable<GetDispatch<ThunkApiConfig>>,
  getState: () => GetState<ThunkApiConfig>,
  extra: GetExtra<ThunkApiConfig>,
) => Promise<ReturnType<AsyncThunkFulfilledActionCreator<Returned, ThunkArg>>> & {
  requestId: string
  arg: ThunkArg
  unwrap: () => Promise<Returned>
}

export type AsyncThunk<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig> = AsyncThunkActionCreator<
  Returned,
  ThunkArg,
  ThunkApiConfig
> & {
  fulfilled: AsyncThunkFulfilledActionCreator<Returned, ThunkArg>
}

export type OverrideThunkApiConfigs<OldConfig, NewConfig> = NewConfig & Omit<OldConfig, keyof NewConfig>

type GetSerializedErrorType<ThunkApiConfig> = ThunkApiConfig extends {
  serializedErrorType: infer GetSerializedErrorType
}
  ? GetSerializedErrorType
  : SerializedError

export interface SerializedError {
  name?: string
  message?: string
  stack?: string
  code?: string
}

export type AsyncThunkOptions<ThunkArg = void, ThunkApiConfig extends AsyncThunkConfig = {}> = {
  condition?(
    arg: ThunkArg,
    api: Pick<GetThunkAPI<ThunkApiConfig>, 'getState' | 'extra'>,
  ): MaybePromise<boolean | undefined>
  dispatchConditionRejection?: boolean
  serializeError?: (x: unknown) => GetSerializedErrorType<ThunkApiConfig>
  idGenerator?: (arg: ThunkArg) => string
}

export type AsyncThunkFulfilledActionCreator<Returned, ThunkArg> = ActionCreatorWithPreparedPayload<
  [Returned, string, ThunkArg],
  Returned,
  string,
  never,
  {
    arg: ThunkArg
    requestId: string
    requestStatus: 'fulfilled'
  }
>

type CreateAsyncThunk<CurriedThunkApiConfig extends AsyncThunkConfig = AsyncThunkConfig> = {
  // <Returned, ThunkArg = void>(
  //   typePrefix: string,
  //   payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, CurriedThunkApiConfig>,
  // ): AsyncThunk<Returned, ThunkArg, CurriedThunkApiConfig>

  <Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig>(
    typePrefix: string,
    payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>,
  ): AsyncThunk<Returned, ThunkArg, OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>>

  withTypes<ThunkApiConfig extends AsyncThunkConfig>(): CreateAsyncThunk<
    OverrideThunkApiConfigs<CurriedThunkApiConfig, ThunkApiConfig>
  >
}

type WithStrictNullChecks<True, False> = undefined extends boolean ? False : True

export const createAsyncThunk = (() => {
  function createAsyncThunk<Returned, ThunkArg, ThunkApiConfig extends AsyncThunkConfig>(
    typePrefix: string,
    payloadCreator: AsyncThunkPayloadCreator<Returned, ThunkArg, ThunkApiConfig>,
  ): AsyncThunk<Returned, ThunkArg, ThunkApiConfig> {
    const fulfilled: AsyncThunkFulfilledActionCreator<Returned, ThunkArg> = createAction(
      typePrefix + '/fulfilled',
      (payload: Returned, requestId: string, arg: ThunkArg) => ({
        payload,
        meta: {
          arg,
          requestId,
          requestStatus: 'fulfilled' as const,
        },
      }),
    )

    function actionCreator(arg: ThunkArg): AsyncThunkAction<Returned, ThunkArg, ThunkApiConfig> {
      return (dispatch, getState, extra) => {
        const requestId = '123'

        const promise = (async function () {
          return dispatch(
            (await Promise.resolve(payloadCreator(arg, { dispatch, getState, extra, requestId })).then((result) =>
              fulfilled(result as any, requestId, arg),
            )) as any,
          )
        })()
        return Object.assign(promise, { requestId, arg, unwrap: () => promise.then<any>(unwrapResult) })
      }
    }

    return Object.assign(actionCreator as AsyncThunkActionCreator<Returned, ThunkArg, ThunkApiConfig>, { fulfilled })
  }
  createAsyncThunk.withTypes = () => createAsyncThunk

  return createAsyncThunk as CreateAsyncThunk
})()

const thunkCreator: AsyncThunkPayloadCreator<
  void,
  void,
  {
    state: any
    dispatch: AppDispatch
  }
> = (_, thunkApi) => {
  thunkApi.dispatch(increment())
}

export const thunk = createAsyncThunk('thunk', thunkCreator)
