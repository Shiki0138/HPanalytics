import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '../store'
import Cookies from 'js-cookie'

// Generate CSRF token for requests
const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  credentials: 'include', // Include cookies in requests
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token || Cookies.get('auth_token')
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    
    // Add CSRF protection
    const csrfToken = Cookies.get('csrf_token') || generateCSRFToken()
    if (!Cookies.get('csrf_token')) {
      Cookies.set('csrf_token', csrfToken, { 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      })
    }
    headers.set('x-csrf-token', csrfToken)
    
    // Add security headers
    headers.set('x-requested-with', 'XMLHttpRequest')
    headers.set('content-type', 'application/json')
    
    return headers
  },
})

// Enhanced base query with automatic token refresh
const baseQueryWithReauth = async (args: unknown, api: { getState: () => RootState; dispatch: (action: any) => void }, extraOptions: unknown) => {
  let result = await baseQuery(args, api, extraOptions)
  
  // If we get a 401 and have a refresh token, try to refresh
  if (result.error && result.error.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken || 
                        Cookies.get('refresh_token')
    
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      )
      
      if (refreshResult.data) {
        // Token refresh successful
        api.dispatch({
          type: 'auth/tokenRefreshSuccess',
          payload: refreshResult.data,
        })
        
        // Retry the original request
        result = await baseQuery(args, api, extraOptions)
      } else {
        // Refresh failed, force logout
        api.dispatch({ type: 'auth/tokenRefreshFailure' })
      }
    } else {
      // No refresh token, force logout
      api.dispatch({ type: 'auth/logout' })
    }
  }
  
  return result
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Analytics', 'Website', 'Auth'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    refreshToken: builder.mutation({
      query: (refreshData) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: refreshData,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['User', 'Auth'],
    }),
    verifyEmail: builder.mutation({
      query: (token) => ({
        url: '/auth/verify-email',
        method: 'POST',
        body: { token },
      }),
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { token, password },
      }),
    }),
    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: '/auth/change-password',
        method: 'POST',
        body: passwordData,
      }),
      invalidatesTags: ['User'],
    }),
    enableMFA: builder.mutation({
      query: () => ({
        url: '/auth/mfa/enable',
        method: 'POST',
      }),
      invalidatesTags: ['User'],
    }),
    disableMFA: builder.mutation({
      query: (code) => ({
        url: '/auth/mfa/disable',
        method: 'POST',
        body: { code },
      }),
      invalidatesTags: ['User'],
    }),
    verifyMFA: builder.mutation({
      query: (code) => ({
        url: '/auth/mfa/verify',
        method: 'POST',
        body: { code },
      }),
    }),
    getProfile: builder.query({
      query: () => '/auth/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (profileData) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: profileData,
      }),
      invalidatesTags: ['User'],
    }),
    // Analytics endpoints
    getAnalyticsSummary: builder.query({
      query: (params) => ({
        url: '/analytics/summary',
        params,
      }),
      providesTags: ['Analytics'],
    }),
    // Website management endpoints
    getWebsites: builder.query({
      query: () => '/websites',
      providesTags: ['Website'],
    }),
    addWebsite: builder.mutation({
      query: (websiteData) => ({
        url: '/websites',
        method: 'POST',
        body: websiteData,
      }),
      invalidatesTags: ['Website'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useEnableMFAMutation,
  useDisableMFAMutation,
  useVerifyMFAMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetAnalyticsSummaryQuery,
  useGetWebsitesQuery,
  useAddWebsiteMutation,
} = apiSlice