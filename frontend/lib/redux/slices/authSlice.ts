import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  name: string
  role: string
  emailVerified: boolean
  mfaEnabled: boolean
  lastLoginAt?: string
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  sessionExpiry: number | null
  loginAttempts: number
  lockoutUntil: number | null
  rememberMe: boolean
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  sessionExpiry: null,
  loginAttempts: 0,
  lockoutUntil: null,
  rememberMe: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{ 
      user: User; 
      token: string; 
      refreshToken: string;
      expiresIn: number;
      rememberMe?: boolean;
    }>) => {
      state.isLoading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.sessionExpiry = Date.now() + action.payload.expiresIn * 1000
      state.error = null
      state.loginAttempts = 0
      state.lockoutUntil = null
      state.rememberMe = action.payload.rememberMe || false

      // Store tokens securely in HTTP-only cookies (simulated with secure cookie options)
      const cookieOptions = {
        httpOnly: false, // Note: true httpOnly cookies can't be set from client-side
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        expires: action.payload.rememberMe ? 30 : 1, // 30 days or 1 day
      }
      
      Cookies.set('auth_token', action.payload.token, cookieOptions)
      Cookies.set('refresh_token', action.payload.refreshToken, {
        ...cookieOptions,
        expires: 30, // Refresh token lasts 30 days
      })
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.sessionExpiry = null
      state.error = action.payload
      state.loginAttempts += 1
      
      // Implement lockout after 5 failed attempts
      if (state.loginAttempts >= 5) {
        state.lockoutUntil = Date.now() + 15 * 60 * 1000 // 15 minutes lockout
      }
    },
    registerStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    registerSuccess: (state, action: PayloadAction<{ user: User; message: string }>) => {
      state.isLoading = false
      state.error = null
      // Don't auto-authenticate on registration, require email verification
      console.log('Registration successful:', action.payload.message)
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    tokenRefreshStart: () => {
      // Don't show loading for silent token refresh
      console.log('Token refresh started')
    },
    tokenRefreshSuccess: (state, action: PayloadAction<{ 
      token: string; 
      expiresIn: number 
    }>) => {
      state.token = action.payload.token
      state.sessionExpiry = Date.now() + action.payload.expiresIn * 1000
      
      const cookieOptions = {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        expires: state.rememberMe ? 30 : 1,
      }
      
      Cookies.set('auth_token', action.payload.token, cookieOptions)
    },
    tokenRefreshFailure: (state) => {
      // Force logout on refresh failure
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.sessionExpiry = null
      state.error = 'Session expired. Please log in again.'
      
      Cookies.remove('auth_token')
      Cookies.remove('refresh_token')
    },
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.sessionExpiry = null
      state.error = null
      state.rememberMe = false
      
      // Clear cookies
      Cookies.remove('auth_token')
      Cookies.remove('refresh_token')
    },
    clearError: (state) => {
      state.error = null
    },
    clearLockout: (state) => {
      state.loginAttempts = 0
      state.lockoutUntil = null
    },
    restoreSession: (state, action: PayloadAction<{
      user: User;
      token: string;
      refreshToken: string;
      sessionExpiry: number;
    }>) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken
      state.isAuthenticated = true
      state.sessionExpiry = action.payload.sessionExpiry
    },
  },
})

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  tokenRefreshStart,
  tokenRefreshSuccess,
  tokenRefreshFailure,
  logout, 
  clearError,
  clearLockout,
  restoreSession
} = authSlice.actions

export default authSlice.reducer