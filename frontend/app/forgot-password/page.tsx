'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Paper,
  TextField,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material'
import { LockReset, CheckCircle } from '@mui/icons-material'
import Button from '@/components/common/Button'
import { useForgotPasswordMutation } from '@/lib/redux/services/api'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RateLimiter } from '@/lib/utils/authUtils'

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

// Rate limiter for forgot password requests
const forgotPasswordLimiter = new RateLimiter(3, 15 * 60 * 1000) // 3 attempts per 15 minutes

export default function ForgotPasswordPage() {
  const [forgotPassword] = useForgotPasswordMutation()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [rateLimitTime, setRateLimitTime] = useState(0)
  
  const router = useRouter()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const watchedEmail = watch('email')

  // Rate limit timer
  useEffect(() => {
    if (rateLimitTime > 0) {
      const timer = setTimeout(() => {
        setRateLimitTime(rateLimitTime - 1)
        if (rateLimitTime === 1) {
          setIsRateLimited(false)
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [rateLimitTime])

  // Clear error after 10 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const clientId = 'forgot-password' // In real app, use user IP or session ID
    
    if (!forgotPasswordLimiter.isAllowed(clientId)) {
      const remainingTime = Math.ceil(forgotPasswordLimiter.getRemainingTime(clientId) / 1000)
      setIsRateLimited(true)
      setRateLimitTime(remainingTime)
      setError('リクエスト制限に達しました。しばらくお待ちください')
      return
    }

    try {
      await forgotPassword(data.email.toLowerCase().trim()).unwrap()
      setIsSubmitted(true)
      setError(null)
    } catch (err: unknown) {
      let errorMessage = 'パスワードリセットリクエストに失敗しました'
      
      if (err && typeof err === 'object' && 'data' in err) {
        const errorData = (err as { data?: { message?: string; code?: string } }).data
        if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.code === 'EMAIL_NOT_FOUND') {
          // Don't reveal if email exists or not for security
          setIsSubmitted(true)
          return
        } else if (errorData?.code === 'TOO_MANY_REQUESTS') {
          errorMessage = 'リクエスト制限に達しました。しばらくお待ちください'
          setIsRateLimited(true)
          setRateLimitTime(900) // 15 minutes
        }
      }
      
      setError(errorMessage)
    }
  }

  if (isSubmitted) {
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
              メール送信完了
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              パスワードリセット用のメールを送信しました。
              <br />
              <strong>{watchedEmail}</strong>
              <br />
              メール内のリンクからパスワードをリセットしてください。
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                <strong>重要な注意事項:</strong>
                <br />
                • リンクは24時間で期限切れになります
                <br />
                • メールが届かない場合は、迷惑メールフォルダもご確認ください
                <br />
                • リンクは一度のみ使用可能です
              </Typography>
            </Alert>

            <Button
              variant="contained"
              onClick={() => router.push('/login')}
              sx={{ mt: 2 }}
            >
              ログイン画面に戻る
            </Button>
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
            <LockReset color="primary" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              パスワードリセット
            </Typography>
            <Typography variant="body2" color="text.secondary">
              登録済みのメールアドレスを入力してください
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isRateLimited && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              セキュリティのため、リクエストが制限されています。
              あと {Math.floor(rateLimitTime / 60)} 分 {rateLimitTime % 60} 秒お待ちください。
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="メールアドレス"
                  autoComplete="email"
                  autoFocus
                  disabled={isRateLimited}
                  error={!!errors.email}
                  helperText={errors.email?.message || 'パスワードリセット用のメールを送信します'}
                  inputProps={{
                    maxLength: 254,
                  }}
                />
              )}
            />

            {isSubmitting && <LinearProgress sx={{ mt: 2 }} />}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              loading={isSubmitting}
              disabled={isRateLimited}
              sx={{ mt: 3, mb: 2 }}
            >
              {isRateLimited ? 'リクエスト制限中...' : 'リセットメール送信'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                onClick={() => router.push('/login')}
                color="primary"
              >
                ログイン画面に戻る
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                アカウントをお持ちでない場合？{' '}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => router.push('/register')}
                  sx={{ p: 0, minWidth: 'auto' }}
                >
                  新規登録
                </Button>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              セキュリティのため、リクエスト回数に制限があります
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}