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
  Link as MuiLink,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  LinearProgress,
} from '@mui/material'
import { Visibility, VisibilityOff, Security } from '@mui/icons-material'
import Button from '@/components/common/Button'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { loginStart, loginSuccess, loginFailure, clearError, clearLockout } from '@/lib/redux/slices/authSlice'
import { useLoginMutation } from '@/lib/redux/services/api'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Validation schema with security measures
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます'),
  password: z
    .string()
    .min(1, 'パスワードは必須です')
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(128, 'パスワードが長すぎます'),
  rememberMe: z.boolean().default(false),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [login] = useLoginMutation()
  const dispatch = useAppDispatch()
  const { isLoading, error, loginAttempts, lockoutUntil, isAuthenticated } = useAppSelector((state) => state.auth)
  const router = useRouter()

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  // Calculate remaining lockout time
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0)

  useEffect(() => {
    if (lockoutUntil) {
      const updateTimer = () => {
        const remaining = Math.max(0, lockoutUntil - Date.now())
        setLockoutTimeRemaining(remaining)
        
        if (remaining === 0) {
          dispatch(clearLockout())
        }
      }
      
      const interval = setInterval(updateTimer, 1000)
      updateTimer()
      
      return () => clearInterval(interval)
    }
  }, [lockoutUntil, dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    // Clear error after 5 seconds
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, dispatch])

  const onSubmit = async (data: LoginFormData) => {
    if (lockoutTimeRemaining > 0) {
      return
    }

    dispatch(loginStart())
    
    try {
      const result = await login({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        rememberMe: data.rememberMe,
      }).unwrap()
      
      dispatch(loginSuccess({
        ...result,
        rememberMe: data.rememberMe,
      }))
      
      reset()
      router.push('/dashboard')
    } catch (err: unknown) {
      let errorMessage = 'ログインに失敗しました'
      
      if (err && typeof err === 'object' && 'data' in err) {
        const errorData = (err as { data?: { message?: string; code?: string } }).data
        if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.code === 'ACCOUNT_LOCKED') {
          errorMessage = '複数回のログイン失敗により、アカウントが一時的にロックされました'
        } else if (errorData?.code === 'INVALID_CREDENTIALS') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません'
        } else if (errorData?.code === 'EMAIL_NOT_VERIFIED') {
          errorMessage = 'メールアドレスの認証が完了していません'
        }
      }
      
      dispatch(loginFailure(errorMessage))
    }
  }

  const isLocked = lockoutTimeRemaining > 0
  const lockoutMinutes = Math.ceil(lockoutTimeRemaining / (1000 * 60))

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
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Security color="primary" sx={{ fontSize: 40 }} />
            </Box>
            <Typography component="h1" variant="h4" gutterBottom>
              AI Web Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              セキュアログイン
            </Typography>
          </Box>
          
          {isLocked && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                セキュリティのため、アカウントが一時的にロックされています。
                <br />
                あと {lockoutMinutes} 分お待ちください。
              </Typography>
            </Alert>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {loginAttempts > 0 && loginAttempts < 5 && !isLocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              ログイン失敗回数: {loginAttempts}/5
              <br />
              5回失敗するとアカウントが一時的にロックされます。
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
                  disabled={isLocked}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  inputProps={{
                    maxLength: 254,
                  }}
                />
              )}
            />
            
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="パスワード"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={isLocked}
                  error={!!errors.password}
                  helperText={errors.password?.message}
                  inputProps={{
                    maxLength: 128,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          disabled={isLocked}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
            
            <Controller
              name="rememberMe"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value}
                      onChange={onChange}
                      disabled={isLocked}
                      color="primary"
                    />
                  }
                  label="ログイン状態を保持する (30日間)"
                  sx={{ mt: 1 }}
                />
              )}
            />
            
            {isLoading && <LinearProgress sx={{ mt: 2 }} />}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              loading={isLoading}
              disabled={isLocked}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLocked ? 'ロック中...' : 'セキュアログイン'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <MuiLink href="/forgot-password" variant="body2" color="primary">
                パスワードを忘れた場合
              </MuiLink>
            </Box>
            
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                アカウントをお持ちでない場合？{' '}
                <MuiLink href="/register" color="primary">
                  新規登録
                </MuiLink>
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              このサイトはセキュリティ対策により保護されています
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}