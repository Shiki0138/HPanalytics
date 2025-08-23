import Cookies from 'js-cookie'
import { useAppDispatch } from '@/lib/redux/hooks'
import { logout, tokenRefreshStart, tokenRefreshSuccess, tokenRefreshFailure } from '@/lib/redux/slices/authSlice'

// Token refresh utility
export const setupTokenRefresh = (
  dispatch: ReturnType<typeof useAppDispatch>,
  sessionExpiry: number | null,
  refreshToken: string | null
) => {
  if (!sessionExpiry || !refreshToken) return

  // Calculate time until token refresh (5 minutes before expiry)
  const refreshTime = sessionExpiry - Date.now() - (5 * 60 * 1000)
  
  if (refreshTime > 0) {
    setTimeout(async () => {
      try {
        dispatch(tokenRefreshStart())
        
        // Make refresh request
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        })

        if (response.ok) {
          const data = await response.json()
          dispatch(tokenRefreshSuccess(data))
        } else {
          throw new Error('Token refresh failed')
        }
      } catch (error) {
        console.error('Auto token refresh failed:', error)
        dispatch(tokenRefreshFailure())
      }
    }, refreshTime)
  }
}

// Secure logout utility
export const secureLogout = async (dispatch: ReturnType<typeof useAppDispatch>) => {
  try {
    // Call logout endpoint to invalidate server-side session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Server logout failed:', error)
  } finally {
    // Always clear local state and cookies
    dispatch(logout())
    
    // Clear all auth-related cookies
    Cookies.remove('auth_token')
    Cookies.remove('refresh_token')
    Cookies.remove('csrf_token')
    
    // Clear localStorage and sessionStorage
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login
    window.location.href = '/login'
  }
}

// Validate token format (basic JWT structure check)
export const isValidTokenFormat = (token: string): boolean => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Try to decode the payload
    JSON.parse(atob(parts[1]))
    return true
  } catch {
    return false
  }
}

// Extract token payload safely
export const getTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    if (!isValidTokenFormat(token)) return null
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  const payload = getTokenPayload(token)
  if (!payload || !payload.exp) return true
  
  return Date.now() >= payload.exp * 1000
}

// Generate secure CSRF token
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Set secure cookie options
export const getSecureCookieOptions = (rememberMe: boolean = false) => ({
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  expires: rememberMe ? 30 : 1, // 30 days or 1 day
  httpOnly: false, // Note: Cannot set httpOnly from client-side
})

// Password strength checker
export const checkPasswordStrength = (password: string) => {
  let score = 0
  const feedback = []

  if (password.length >= 8) score += 1
  else feedback.push('8文字以上')

  if (/[a-z]/.test(password)) score += 1
  else feedback.push('小文字')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('大文字')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('数字')

  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('特殊文字')

  const strength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong'
  return { score, strength, feedback }
}

// Rate limiting helper
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (record.count >= this.maxAttempts) {
      return false
    }

    record.count++
    return true
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key)
    if (!record || record.count < this.maxAttempts) return 0
    
    return Math.max(0, record.resetTime - Date.now())
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

// Sanitize input to prevent XSS
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

// Security headers for fetch requests
export const getSecureHeaders = (includeAuth: boolean = true) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }

  // Add CSRF token
  const csrfToken = Cookies.get('csrf_token')
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  // Add auth token if requested and available
  if (includeAuth) {
    const authToken = Cookies.get('auth_token')
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
  }

  return headers
}