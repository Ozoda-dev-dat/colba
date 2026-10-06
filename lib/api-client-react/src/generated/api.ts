
import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

import type {
  Branch,
  BranchInput,
  DashboardSummary,
  HealthStatus,
  ListPrintRequestsParams,
  PrintRequest,
  PrintRequestInput,
  PrinterLoginInput,
  PrinterLogout200,
  RequestStatusInput,
  SchoolUser,
  UploadUrl,
  UploadUrlInput,
  UserAssignment,
  UserProfile
} from './api.schemas';

import { customFetch } from '../custom-fetch';
import type { ErrorType , BodyType } from '../custom-fetch';

type AwaitedInput<T> = PromiseLike<T> | T;

      type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;


type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];



const withQueryKey = <T extends object, K>(query: T, queryKey: K): T & { queryKey: K } => {
  const result = { queryKey } as T & { queryKey: K };
  for (const key of Object.keys(query)) {
    // The explicit queryKey always wins, matching the previous
    // `{ ...query, queryKey }` spread where it was set last.
    if (key === 'queryKey') continue;
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => (query as Record<string, unknown>)[key],
    });
  }
  return result;
};

export const getHealthCheckUrl = () => {




  return `/api/healthz`
}

/**
 * Returns server health status
 * @summary Health check
 */
export const healthCheck = async ( options?: Parameters<typeof customFetch>[1]): Promise<HealthStatus> => {

  return customFetch<HealthStatus>(getHealthCheckUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getHealthCheckQueryKey = () => {
    return [
    `/api/healthz`
    ] as const;
    }


export const getHealthCheckQueryOptions = <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getHealthCheckQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheck>>> = ({ signal }) => healthCheck({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & { queryKey: QueryKey }
}

export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>
export type HealthCheckQueryError = ErrorType<unknown>


/**
 * @summary Health check
 */

export function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getHealthCheckQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetCurrentUserUrl = () => {




  return `/api/me`
}

/**
 * @summary Get the signed-in printer's profile
 */
export const getCurrentUser = async ( options?: Parameters<typeof customFetch>[1]): Promise<UserProfile> => {

  return customFetch<UserProfile>(getGetCurrentUserUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetCurrentUserQueryKey = () => {
    return [
    `/api/me`
    ] as const;
    }


export const getGetCurrentUserQueryOptions = <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<void>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetCurrentUserQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getCurrentUser>>> = ({ signal }) => getCurrentUser({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & { queryKey: QueryKey }
}

export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
export type GetCurrentUserQueryError = ErrorType<void>


/**
 * @summary Get the signed-in printer's profile
 */

export function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<void>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetCurrentUserQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getPrinterLoginUrl = () => {




  return `/api/auth/login`
}

/**
 * @summary Sign in a printer employee
 */
export const printerLogin = async (printerLoginInput: PrinterLoginInput, options?: Parameters<typeof customFetch>[1]): Promise<UserProfile> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<UserProfile>(getPrinterLoginUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(printerLoginInput)
  }
);}





export const getPrinterLoginMutationKey = () => ['printerLogin'] as const;

export const getPrinterLoginMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof printerLogin>>, TError,PrinterLoginMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof printerLogin>>, TError,PrinterLoginMutationVariables, TContext> => {

const mutationKey = getPrinterLoginMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof printerLogin>>, PrinterLoginMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  printerLogin(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrinterLoginMutationResult = NonNullable<Awaited<ReturnType<typeof printerLogin>>>
    export type PrinterLoginMutationBody = BodyType<PrinterLoginInput>
    export type PrinterLoginMutationError = ErrorType<void>
    export type PrinterLoginMutationVariables = {data: BodyType<PrinterLoginInput>}

    /**
 * @summary Sign in a printer employee
 */
export const usePrinterLogin = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof printerLogin>>, TError,PrinterLoginMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof printerLogin>>,
        TError,
        PrinterLoginMutationVariables,
        TContext
      > => {
      return useMutation(getPrinterLoginMutationOptions(options));
    }

export const getPrinterLogoutUrl = () => {




  return `/api/auth/logout`
}

/**
 * @summary End the printer session
 */
export const printerLogout = async ( options?: Parameters<typeof customFetch>[1]): Promise<PrinterLogout200> => {

  return customFetch<PrinterLogout200>(getPrinterLogoutUrl(),
  {
    ...options,
    method: 'POST'


  }
);}





export const getPrinterLogoutMutationKey = () => ['printerLogout'] as const;

export const getPrinterLogoutMutationOptions = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof printerLogout>>, TError,void, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof printerLogout>>, TError,void, TContext> => {

const mutationKey = getPrinterLogoutMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof printerLogout>>, void> = () => {


          return  printerLogout(requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrinterLogoutMutationResult = NonNullable<Awaited<ReturnType<typeof printerLogout>>>

    export type PrinterLogoutMutationError = ErrorType<unknown>


    /**
 * @summary End the printer session
 */
export const usePrinterLogout = <TError = ErrorType<unknown>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof printerLogout>>, TError,void, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof printerLogout>>,
        TError,
        void,
        TContext
      > => {
      return useMutation(getPrinterLogoutMutationOptions(options));
    }

export const getListPublicBranchesUrl = () => {




  return `/api/public/branches`
}

/**
 * @summary List the three branches available for teacher requests
 */
export const listPublicBranches = async ( options?: Parameters<typeof customFetch>[1]): Promise<Branch[]> => {

  return customFetch<Branch[]>(getListPublicBranchesUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListPublicBranchesQueryKey = () => {
    return [
    `/api/public/branches`
    ] as const;
    }


export const getListPublicBranchesQueryOptions = <TData = Awaited<ReturnType<typeof listPublicBranches>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listPublicBranches>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListPublicBranchesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listPublicBranches>>> = ({ signal }) => listPublicBranches({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listPublicBranches>>, TError, TData> & { queryKey: QueryKey }
}

export type ListPublicBranchesQueryResult = NonNullable<Awaited<ReturnType<typeof listPublicBranches>>>
export type ListPublicBranchesQueryError = ErrorType<unknown>


/**
 * @summary List the three branches available for teacher requests
 */

export function useListPublicBranches<TData = Awaited<ReturnType<typeof listPublicBranches>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listPublicBranches>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListPublicBranchesQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getGetDashboardUrl = () => {




  return `/api/dashboard`
}

/**
 * @summary Get branch-scoped print queue counts
 */
export const getDashboard = async ( options?: Parameters<typeof customFetch>[1]): Promise<DashboardSummary> => {

  return customFetch<DashboardSummary>(getGetDashboardUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetDashboardQueryKey = () => {
    return [
    `/api/dashboard`
    ] as const;
    }


export const getGetDashboardQueryOptions = <TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetDashboardQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getDashboard>>> = ({ signal }) => getDashboard({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData> & { queryKey: QueryKey }
}

export type GetDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboard>>>
export type GetDashboardQueryError = ErrorType<unknown>


/**
 * @summary Get branch-scoped print queue counts
 */

export function useGetDashboard<TData = Awaited<ReturnType<typeof getDashboard>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getDashboard>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetDashboardQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getListBranchesUrl = () => {




  return `/api/branches`
}

/**
 * @summary List branches visible to the current user
 */
export const listBranches = async ( options?: Parameters<typeof customFetch>[1]): Promise<Branch[]> => {

  return customFetch<Branch[]>(getListBranchesUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListBranchesQueryKey = () => {
    return [
    `/api/branches`
    ] as const;
    }


export const getListBranchesQueryOptions = <TData = Awaited<ReturnType<typeof listBranches>>, TError = ErrorType<unknown>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListBranchesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listBranches>>> = ({ signal }) => listBranches({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData> & { queryKey: QueryKey }
}

export type ListBranchesQueryResult = NonNullable<Awaited<ReturnType<typeof listBranches>>>
export type ListBranchesQueryError = ErrorType<unknown>


/**
 * @summary List branches visible to the current user
 */

export function useListBranches<TData = Awaited<ReturnType<typeof listBranches>>, TError = ErrorType<unknown>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listBranches>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListBranchesQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getCreateBranchUrl = () => {




  return `/api/branches`
}

/**
 * @summary Create a school branch
 */
export const createBranch = async (branchInput: BranchInput, options?: Parameters<typeof customFetch>[1]): Promise<Branch> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<Branch>(getCreateBranchUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(branchInput)
  }
);}





export const getCreateBranchMutationKey = () => ['createBranch'] as const;

export const getCreateBranchMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError,CreateBranchMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError,CreateBranchMutationVariables, TContext> => {

const mutationKey = getCreateBranchMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof createBranch>>, CreateBranchMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  createBranch(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CreateBranchMutationResult = NonNullable<Awaited<ReturnType<typeof createBranch>>>
    export type CreateBranchMutationBody = BodyType<BranchInput>
    export type CreateBranchMutationError = ErrorType<void>
    export type CreateBranchMutationVariables = {data: BodyType<BranchInput>}

    /**
 * @summary Create a school branch
 */
export const useCreateBranch = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createBranch>>, TError,CreateBranchMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof createBranch>>,
        TError,
        CreateBranchMutationVariables,
        TContext
      > => {
      return useMutation(getCreateBranchMutationOptions(options));
    }

export const getListUsersUrl = () => {




  return `/api/users`
}

/**
 * @summary List school accounts for the administrator
 */
export const listUsers = async ( options?: Parameters<typeof customFetch>[1]): Promise<SchoolUser[]> => {

  return customFetch<SchoolUser[]>(getListUsersUrl(),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListUsersQueryKey = () => {
    return [
    `/api/users`
    ] as const;
    }


export const getListUsersQueryOptions = <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<void>>( options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListUsersQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listUsers>>> = ({ signal }) => listUsers({ signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & { queryKey: QueryKey }
}

export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>
export type ListUsersQueryError = ErrorType<void>


/**
 * @summary List school accounts for the administrator
 */

export function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<void>>(
  options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListUsersQueryOptions(options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getUpdateUserAssignmentUrl = (clerkId: string,) => {




  return `/api/users/${clerkId}`
}

/**
 * @summary Assign a user role and branch
 */
export const updateUserAssignment = async (clerkId: string,
    userAssignment: UserAssignment, options?: Parameters<typeof customFetch>[1]): Promise<SchoolUser> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<SchoolUser>(getUpdateUserAssignmentUrl(clerkId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(userAssignment)
  }
);}





export const getUpdateUserAssignmentMutationKey = () => ['updateUserAssignment'] as const;

export const getUpdateUserAssignmentMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateUserAssignment>>, TError,UpdateUserAssignmentMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updateUserAssignment>>, TError,UpdateUserAssignmentMutationVariables, TContext> => {

const mutationKey = getUpdateUserAssignmentMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updateUserAssignment>>, UpdateUserAssignmentMutationVariables> = (props) => {
          const {clerkId,data} = props ?? {};

          return  updateUserAssignment(clerkId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdateUserAssignmentMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserAssignment>>>
    export type UpdateUserAssignmentMutationBody = BodyType<UserAssignment>
    export type UpdateUserAssignmentMutationError = ErrorType<void>
    export type UpdateUserAssignmentMutationVariables = {clerkId: string;data: BodyType<UserAssignment>}

    /**
 * @summary Assign a user role and branch
 */
export const useUpdateUserAssignment = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updateUserAssignment>>, TError,UpdateUserAssignmentMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updateUserAssignment>>,
        TError,
        UpdateUserAssignmentMutationVariables,
        TContext
      > => {
      return useMutation(getUpdateUserAssignmentMutationOptions(options));
    }

export const getListPrintRequestsUrl = (params?: ListPrintRequestsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `/api/print-requests?${stringifiedParams}` : `/api/print-requests`
}

/**
 * @summary List requests visible to the current user
 */
export const listPrintRequests = async (params?: ListPrintRequestsParams, options?: Parameters<typeof customFetch>[1]): Promise<PrintRequest[]> => {

  return customFetch<PrintRequest[]>(getListPrintRequestsUrl(params),
  {
    ...options,
    method: 'GET'


  }
);}





export const getListPrintRequestsQueryKey = (params?: ListPrintRequestsParams,) => {
    return [
    `/api/print-requests`, ...(params ? [params] : [])
    ] as const;
    }


export const getListPrintRequestsQueryOptions = <TData = Awaited<ReturnType<typeof listPrintRequests>>, TError = ErrorType<unknown>>(params?: ListPrintRequestsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listPrintRequests>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getListPrintRequestsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof listPrintRequests>>> = ({ signal }) => listPrintRequests(params, { signal, ...requestOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof listPrintRequests>>, TError, TData> & { queryKey: QueryKey }
}

export type ListPrintRequestsQueryResult = NonNullable<Awaited<ReturnType<typeof listPrintRequests>>>
export type ListPrintRequestsQueryError = ErrorType<unknown>


/**
 * @summary List requests visible to the current user
 */

export function useListPrintRequests<TData = Awaited<ReturnType<typeof listPrintRequests>>, TError = ErrorType<unknown>>(
 params?: ListPrintRequestsParams, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof listPrintRequests>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getListPrintRequestsQueryOptions(params,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getCreatePrintRequestUrl = () => {




  return `/api/print-requests`
}

/**
 * @summary Submit a teacher print request without requiring an account
 */
export const createPrintRequest = async (printRequestInput: PrintRequestInput, options?: Parameters<typeof customFetch>[1]): Promise<PrintRequest> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<PrintRequest>(getCreatePrintRequestUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(printRequestInput)
  }
);}





export const getCreatePrintRequestMutationKey = () => ['createPrintRequest'] as const;

export const getCreatePrintRequestMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createPrintRequest>>, TError,CreatePrintRequestMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof createPrintRequest>>, TError,CreatePrintRequestMutationVariables, TContext> => {

const mutationKey = getCreatePrintRequestMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof createPrintRequest>>, CreatePrintRequestMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  createPrintRequest(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type CreatePrintRequestMutationResult = NonNullable<Awaited<ReturnType<typeof createPrintRequest>>>
    export type CreatePrintRequestMutationBody = BodyType<PrintRequestInput>
    export type CreatePrintRequestMutationError = ErrorType<void>
    export type CreatePrintRequestMutationVariables = {data: BodyType<PrintRequestInput>}

    /**
 * @summary Submit a teacher print request without requiring an account
 */
export const useCreatePrintRequest = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof createPrintRequest>>, TError,CreatePrintRequestMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof createPrintRequest>>,
        TError,
        CreatePrintRequestMutationVariables,
        TContext
      > => {
      return useMutation(getCreatePrintRequestMutationOptions(options));
    }

export const getGetPrintRequestUrl = (id: number,) => {




  return `/api/print-requests/${id}`
}

/**
 * @summary Get a request the current user is allowed to access
 */
export const getPrintRequest = async (id: number, options?: Parameters<typeof customFetch>[1]): Promise<PrintRequest> => {

  return customFetch<PrintRequest>(getGetPrintRequestUrl(id),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetPrintRequestQueryKey = (id: number,) => {
    return [
    `/api/print-requests/${id}`
    ] as const;
    }


export const getGetPrintRequestQueryOptions = <TData = Awaited<ReturnType<typeof getPrintRequest>>, TError = ErrorType<void>>(id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPrintRequest>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetPrintRequestQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getPrintRequest>>> = ({ signal }) => getPrintRequest(id, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getPrintRequest>>, TError, TData> & { queryKey: QueryKey }
}

export type GetPrintRequestQueryResult = NonNullable<Awaited<ReturnType<typeof getPrintRequest>>>
export type GetPrintRequestQueryError = ErrorType<void>


/**
 * @summary Get a request the current user is allowed to access
 */

export function useGetPrintRequest<TData = Awaited<ReturnType<typeof getPrintRequest>>, TError = ErrorType<void>>(
 id: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPrintRequest>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetPrintRequestQueryOptions(id,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







export const getUpdatePrintRequestStatusUrl = (id: number,) => {




  return `/api/print-requests/${id}/status`
}

/**
 * @summary Update the status of a request in the printer's branch
 */
export const updatePrintRequestStatus = async (id: number,
    requestStatusInput: RequestStatusInput, options?: Parameters<typeof customFetch>[1]): Promise<PrintRequest> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<PrintRequest>(getUpdatePrintRequestStatusUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(requestStatusInput)
  }
);}





export const getUpdatePrintRequestStatusMutationKey = () => ['updatePrintRequestStatus'] as const;

export const getUpdatePrintRequestStatusMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updatePrintRequestStatus>>, TError,UpdatePrintRequestStatusMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof updatePrintRequestStatus>>, TError,UpdatePrintRequestStatusMutationVariables, TContext> => {

const mutationKey = getUpdatePrintRequestStatusMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof updatePrintRequestStatus>>, UpdatePrintRequestStatusMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  updatePrintRequestStatus(id,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UpdatePrintRequestStatusMutationResult = NonNullable<Awaited<ReturnType<typeof updatePrintRequestStatus>>>
    export type UpdatePrintRequestStatusMutationBody = BodyType<RequestStatusInput>
    export type UpdatePrintRequestStatusMutationError = ErrorType<void>
    export type UpdatePrintRequestStatusMutationVariables = {id: number;data: BodyType<RequestStatusInput>}

    /**
 * @summary Update the status of a request in the printer's branch
 */
export const useUpdatePrintRequestStatus = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof updatePrintRequestStatus>>, TError,UpdatePrintRequestStatusMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof updatePrintRequestStatus>>,
        TError,
        UpdatePrintRequestStatusMutationVariables,
        TContext
      > => {
      return useMutation(getUpdatePrintRequestStatusMutationOptions(options));
    }

export const getRequestUploadUrlUrl = () => {




  return `/api/storage/uploads/request-url`
}

/**
 * @summary Create a one-time upload reservation for a teacher submission
 */
export const requestUploadUrl = async (uploadUrlInput: UploadUrlInput, options?: Parameters<typeof customFetch>[1]): Promise<UploadUrl> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<UploadUrl>(getRequestUploadUrlUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(uploadUrlInput)
  }
);}





export const getRequestUploadUrlMutationKey = () => ['requestUploadUrl'] as const;

export const getRequestUploadUrlMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError,RequestUploadUrlMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError,RequestUploadUrlMutationVariables, TContext> => {

const mutationKey = getRequestUploadUrlMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof requestUploadUrl>>, RequestUploadUrlMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  requestUploadUrl(data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type RequestUploadUrlMutationResult = NonNullable<Awaited<ReturnType<typeof requestUploadUrl>>>
    export type RequestUploadUrlMutationBody = BodyType<UploadUrlInput>
    export type RequestUploadUrlMutationError = ErrorType<void>
    export type RequestUploadUrlMutationVariables = {data: BodyType<UploadUrlInput>}

    /**
 * @summary Create a one-time upload reservation for a teacher submission
 */
export const useRequestUploadUrl = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError,RequestUploadUrlMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof requestUploadUrl>>,
        TError,
        RequestUploadUrlMutationVariables,
        TContext
      > => {
      return useMutation(getRequestUploadUrlMutationOptions(options));
    }

export const getUploadFileToDatabaseUrl = (uploadId: string,) => {




  return `/api/storage/uploads/${uploadId}`
}

/**
 * @summary Store one uploaded file in Neon
 */
export const uploadFileToDatabase = async (uploadId: string,
    uploadFileToDatabaseBody: Blob, options?: Parameters<typeof customFetch>[1]): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
return customFetch<void>(getUploadFileToDatabaseUrl(uploadId),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream', ...getHeaders(options?.headers) },
    body: uploadFileToDatabaseBody
  }
);}





export const getUploadFileToDatabaseMutationKey = () => ['uploadFileToDatabase'] as const;

export const getUploadFileToDatabaseMutationOptions = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof uploadFileToDatabase>>, TError,UploadFileToDatabaseMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
): UseMutationOptions<Awaited<ReturnType<typeof uploadFileToDatabase>>, TError,UploadFileToDatabaseMutationVariables, TContext> => {

const mutationKey = getUploadFileToDatabaseMutationKey();
const {mutation: mutationOptions, request: requestOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, request: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof uploadFileToDatabase>>, UploadFileToDatabaseMutationVariables> = (props) => {
          const {uploadId,data} = props ?? {};

          return  uploadFileToDatabase(uploadId,data,requestOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type UploadFileToDatabaseMutationResult = NonNullable<Awaited<ReturnType<typeof uploadFileToDatabase>>>
    export type UploadFileToDatabaseMutationBody = BodyType<Blob>
    export type UploadFileToDatabaseMutationError = ErrorType<void>
    export type UploadFileToDatabaseMutationVariables = {uploadId: string;data: BodyType<Blob>}

    /**
 * @summary Store one uploaded file in Neon
 */
export const useUploadFileToDatabase = <TError = ErrorType<void>,
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof uploadFileToDatabase>>, TError,UploadFileToDatabaseMutationVariables, TContext>, request?: SecondParameter<typeof customFetch>}
 ): UseMutationResult<
        Awaited<ReturnType<typeof uploadFileToDatabase>>,
        TError,
        UploadFileToDatabaseMutationVariables,
        TContext
      > => {
      return useMutation(getUploadFileToDatabaseMutationOptions(options));
    }

export const getGetPrintRequestFileUrl = (requestId: number,
    fileIndex: number,) => {




  return `/api/storage/requests/${requestId}/files/${fileIndex}`
}

/**
 * @summary Download an attachment after branch/owner authorization
 */
export const getPrintRequestFile = async (requestId: number,
    fileIndex: number, options?: Parameters<typeof customFetch>[1]): Promise<Blob> => {

  return customFetch<Blob>(getGetPrintRequestFileUrl(requestId,fileIndex),
  {
    ...options,
    method: 'GET'


  }
);}





export const getGetPrintRequestFileQueryKey = (requestId: number,
    fileIndex: number,) => {
    return [
    `/api/storage/requests/${requestId}/files/${fileIndex}`
    ] as const;
    }


export const getGetPrintRequestFileQueryOptions = <TData = Awaited<ReturnType<typeof getPrintRequestFile>>, TError = ErrorType<void>>(requestId: number,
    fileIndex: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPrintRequestFile>>, TError, TData>, request?: SecondParameter<typeof customFetch>}
) => {

const {query: queryOptions, request: requestOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getGetPrintRequestFileQueryKey(requestId,fileIndex);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof getPrintRequestFile>>> = ({ signal }) => getPrintRequestFile(requestId,fileIndex, { signal, ...requestOptions });





   return  { queryKey, queryFn, enabled: requestId !== null && requestId !== undefined && fileIndex !== null && fileIndex !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof getPrintRequestFile>>, TError, TData> & { queryKey: QueryKey }
}

export type GetPrintRequestFileQueryResult = NonNullable<Awaited<ReturnType<typeof getPrintRequestFile>>>
export type GetPrintRequestFileQueryError = ErrorType<void>


/**
 * @summary Download an attachment after branch/owner authorization
 */

export function useGetPrintRequestFile<TData = Awaited<ReturnType<typeof getPrintRequestFile>>, TError = ErrorType<void>>(
 requestId: number,
    fileIndex: number, options?: { query?:UseQueryOptions<Awaited<ReturnType<typeof getPrintRequestFile>>, TError, TData>, request?: SecondParameter<typeof customFetch>}

 ):  UseQueryResult<TData, TError> & { queryKey: QueryKey } {

  const queryOptions = getGetPrintRequestFileQueryOptions(requestId,fileIndex,options)

  const query = useQuery(queryOptions) as  UseQueryResult<TData, TError> & { queryKey: QueryKey };

  return withQueryKey(query, queryOptions.queryKey);
}







