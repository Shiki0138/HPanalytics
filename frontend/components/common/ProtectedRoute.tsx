'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { restoreSession, tokenRefreshStart, tokenRefreshSuccess, tokenRefreshFailure } from '@/lib/redux/slices/authSlice'
import { useRefreshTokenMutation } from '@/lib/redux/services/api'
import LoadingSpinner from './LoadingSpinner'
import Cookies from 'js-cookie'
import { Alert, Box } from '@mui/material'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireEmailVerification?: boolean
  requireMFA?: boolean
  allowedRoles?: string[]
}

export default function ProtectedRoute({ 
  children, 
  requireEmailVerification = false,
  requireMFA = false,
  allowedRoles = []
}: ProtectedRouteProps) {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    refreshToken,
    sessionExpiry 
  } = useAppSelector((state) => state.auth)
  
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [refreshTokenMutation] = useRefreshTokenMutation()
  const [isInitializing, setIsInitializing] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to restore session from cookies if not already authenticated
        if (!isAuthenticated) {
          const storedToken = Cookies.get('auth_token')
          const storedRefreshToken = Cookies.get('refresh_token')
          
          if (storedToken && storedRefreshToken) {
            // Validate token expiry (basic check)
            try {
              const payload = JSON.parse(atob(storedToken.split('.')[1]))
              const expiryTime = payload.exp * 1000
              
              if (expiryTime > Date.now()) {
                // Token still valid, restore session
                // Note: In real implementation, you'd want to validate with server
                dispatch(restoreSession({
                  user: payload.user || { 
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    role: payload.role || 'user',
                    emailVerified: payload.emailVerified || false,
                    mfaEnabled: payload.mfaEnabled || false
                  },
                  token: storedToken,
                  refreshToken: storedRefreshToken,
                  sessionExpiry: expiryTime,
                }))
              } else {
                // Token expired, try refresh
                await handleTokenRefresh(storedRefreshToken)
              }
            } catch {
              // Invalid token format, clear cookies
              Cookies.remove('auth_token')
              Cookies.remove('refresh_token')
            }
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setAuthError('認証の初期化に失敗しました')
      } finally {
        setIsInitializing(false)
      }
    }

    initializeAuth()
  }, [isAuthenticated, dispatch])

  const handleTokenRefresh = async (refreshTokenValue: string) => {
    try {
      dispatch(tokenRefreshStart())
      
      const result = await refreshTokenMutation({
        refreshToken: refreshTokenValue
      }).unwrap()
      
      dispatch(tokenRefreshSuccess(result))
    } catch (error) {
      console.error('Token refresh failed:', error)
      dispatch(tokenRefreshFailure())
      setAuthError('セッションの更新に失敗しました。再度ログインしてください。')
    }
  }

  // Auto token refresh
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry || !refreshToken) return

    // Set up token refresh 5 minutes before expiry
    const timeUntilRefresh = sessionExpiry - Date.now() - (5 * 60 * 1000)
    
    if (timeUntilRefresh > 0) {
      const refreshTimeout = setTimeout(async () => {
        await handleTokenRefresh(refreshToken)
      }, timeUntilRefresh)

      return () => clearTimeout(refreshTimeout)
    } else {
      // Token expired or about to expire, refresh immediately
      handleTokenRefresh(refreshToken)
    }
  }, [isAuthenticated, sessionExpiry, refreshToken])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isInitializing && !isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname
      const redirectUrl = currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
      router.push(`/login${redirectUrl}`)
    }
  }, [isAuthenticated, isLoading, isInitializing, router])

  // Check email verification requirement
  useEffect(() => {
    if (isAuthenticated && requireEmailVerification && user && !user.emailVerified) {
      router.push('/verify-email')
    }
  }, [isAuthenticated, requireEmailVerification, user, router])

  // Check MFA requirement
  useEffect(() => {
    if (isAuthenticated && requireMFA && user && user.mfaEnabled && !user.lastLoginAt) {
      router.push('/mfa-verify')
    }
  }, [isAuthenticated, requireMFA, user, router])

  // Check role-based access
  useEffect(() => {
    if (isAuthenticated && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
      setAuthError('このページにアクセスする権限がありません')
    }
  }, [isAuthenticated, allowedRoles, user])

  if (isInitializing || isLoading) {
    return <LoadingSpinner message="認証を確認中..." />
  }

  if (authError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={
          <button onClick={() => router.push('/login')}>
            ログイン画面へ
          </button>
        }>
          {authError}
        </Alert>
      </Box>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect via useEffect
  }

  // Additional security checks
  if (requireEmailVerification && user && !user.emailVerified) {
    return null // Will redirect via useEffect
  }

  if (requireMFA && user && user.mfaEnabled && !user.lastLoginAt) {
    return null // Will redirect via useEffect
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return null // Error shown above
  }

  return <>{children}</>
}