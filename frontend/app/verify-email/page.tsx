'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  Typography,
  Alert,
  Button,
  LinearProgress,
} from '@mui/material'
import { Email, CheckCircle } from '@mui/icons-material'
import { useVerifyEmailMutation } from '@/lib/redux/services/api'

export default function VerifyEmailPage() {
  const [verifyEmail] = useVerifyEmailMutation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || ''
  const token = searchParams?.get('token') || ''

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleVerify = async (verificationToken: string) => {
    setLoading(true)
    setError(null)

    try {
      await verifyEmail(verificationToken).unwrap()
      setSuccess(true)
      
      // Redirect to login after success
      setTimeout(() => {
        router.push('/login?message=email-verified')
      }, 3000)
    } catch (err: unknown) {
      let errorMessage = 'メール認証に失敗しました'
      
      if (err && typeof err === 'object' && 'data' in err) {
        const errorData = (err as { data?: { code?: string; message?: string } }).data
        if (errorData?.code === 'TOKEN_EXPIRED') {
          errorMessage = '認証トークンが期限切れです。新しい認証メールを送信してください'
        } else if (errorData?.code === 'TOKEN_INVALID') {
          errorMessage = '無効な認証トークンです'
        } else if (errorData?.message) {
          errorMessage = errorData.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Auto-verify if token is in URL
  useEffect(() => {
    if (token) {
      handleVerify(token)
    }
  }, [token, handleVerify])

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setResendCooldown(60) // 60 second cooldown
        setError(null)
      } else {
        throw new Error('Failed to resend email')
      }
    } catch {
      setError('認証メールの再送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <CheckCircle color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              認証完了
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              メールアドレスの認証が完了しました。
              <br />
              ログインページに移動しています...
            </Typography>
            <LinearProgress />
          </Paper>
        </Box>
      </Container>
    )
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Email color="primary" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              メール認証
            </Typography>
            <Typography variant="body2" color="text.secondary">
              アカウントを有効化するため、メールアドレスの認証が必要です
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {email && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                認証メールを送信しました:
                <br />
                <strong>{email}</strong>
              </Typography>
            </Alert>
          )}

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              メール内のリンクをクリックして認証を完了してください
            </Typography>

            {email && (
              <Button
                variant="outlined"
                onClick={handleResendEmail}
                disabled={loading || resendCooldown > 0}
                sx={{ mb: 2 }}
              >
                {loading 
                  ? '送信中...' 
                  : resendCooldown > 0 
                    ? `再送信 (${resendCooldown}秒)`
                    : '認証メール再送信'
                }
              </Button>
            )}

            <Box sx={{ mt: 3 }}>
              <Button
                variant="text"
                onClick={() => router.push('/login')}
                color="primary"
              >
                ログイン画面に戻る
              </Button>
            </Box>
          </Box>

          {loading && <LinearProgress sx={{ mt: 2 }} />}
        </Paper>
      </Box>
    </Container>
  )
}