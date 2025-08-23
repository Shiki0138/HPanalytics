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
  IconButton,
  InputAdornment,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
} from '@mui/material'
import { Visibility, VisibilityOff, Security, CheckCircle, Cancel } from '@mui/icons-material'
import Button from '@/components/common/Button'
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks'
import { registerStart, registerSuccess, registerFailure, clearError } from '@/lib/redux/slices/authSlice'
import { useRegisterMutation } from '@/lib/redux/services/api'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Password strength validation
const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上で入力してください')
  .max(128, 'パスワードが長すぎます')
  .regex(/[a-z]/, '小文字を含む必要があります')
  .regex(/[A-Z]/, '大文字を含む必要があります')
  .regex(/[0-9]/, '数字を含む必要があります')
  .regex(/[^a-zA-Z0-9]/, '特殊文字を含む必要があります')

// Registration validation schema
const registerSchema = z.object({
  name: z
    .string()
    .min(1, '名前は必須です')
    .min(2, '名前は2文字以上で入力してください')
    .max(50, '名前が長すぎます')
    .regex(/^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/, '有効な名前を入力してください'),
  email: z
    .string()
    .min(1, 'メールアドレスは必須です')
    .email('有効なメールアドレスを入力してください')
    .max(254, 'メールアドレスが長すぎます'),
  password: passwordSchema,
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: '利用規約に同意する必要があります',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

// Password strength checker
const checkPasswordStrength = (password: string) => {
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

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [register] = useRegisterMutation()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const router = useRouter()

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  const watchedPassword = watch('password', '')
  const passwordStrength = checkPasswordStrength(watchedPassword)

  useEffect(() => {
    // Clear error after 5 seconds
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, dispatch])

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(registerStart())
    
    try {
      const result = await register({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
      }).unwrap()
      
      dispatch(registerSuccess(result))
      reset()
      
      // Show success message and redirect to verification page
      router.push('/verify-email?email=' + encodeURIComponent(data.email))
    } catch (err: unknown) {
      let errorMessage = '登録に失敗しました'
      
      if (err && typeof err === 'object' && 'data' in err) {
        const errorData = (err as { data?: { message?: string; code?: string } }).data
        if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.code === 'EMAIL_ALREADY_EXISTS') {
          errorMessage = 'このメールアドレスは既に登録されています'
        } else if (errorData?.code === 'WEAK_PASSWORD') {
          errorMessage = 'パスワードが弱すぎます。より強力なパスワードを設定してください'
        }
      }
      
      dispatch(registerFailure(errorMessage))
    }
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'error'
      case 'medium': return 'warning'
      case 'strong': return 'success'
      default: return 'default'
    }
  }

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'weak': return '弱い'
      case 'medium': return '普通'
      case 'strong': return '強い'
      default: return ''
    }
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
          py: 4,
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500 }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Security color="primary" sx={{ fontSize: 40 }} />
            </Box>
            <Typography component="h1" variant="h4" gutterBottom>
              新規アカウント作成
            </Typography>
            <Typography variant="body2" color="text.secondary">
              セキュアな分析システムへようこそ
            </Typography>
          </Box>
          
          <Stepper activeStep={0} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>基本情報入力</StepLabel>
            </Step>
            <Step>
              <StepLabel>メール認証</StepLabel>
            </Step>
            <Step>
              <StepLabel>登録完了</StepLabel>
            </Step>
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1 }}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  id="name"
                  label="氏名"
                  autoComplete="name"
                  autoFocus
                  error={!!errors.name}
                  helperText={errors.name?.message}
                  inputProps={{
                    maxLength: 50,
                  }}
                />
              )}
            />
            
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
                  error={!!errors.email}
                  helperText={errors.email?.message || 'メール認証が必要です'}
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
                  autoComplete="new-password"
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
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
            
            {watchedPassword && (
              <Box sx={{ mt: 1, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="caption">パスワード強度:</Typography>
                  <Chip
                    size="small"
                    label={getStrengthText(passwordStrength.strength)}
                    color={getStrengthColor(passwordStrength.strength) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                    icon={
                      passwordStrength.strength === 'strong' ? <CheckCircle /> : <Cancel />
                    }
                  />
                </Box>
                {passwordStrength.feedback.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    必要: {passwordStrength.feedback.join('、')}
                  </Typography>
                )}
              </Box>
            )}
            
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  required
                  fullWidth
                  label="パスワード確認"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                  inputProps={{
                    maxLength: 128,
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle confirm password visibility"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
            
            <Controller
              name="acceptTerms"
              control={control}
              render={({ field: { onChange, value } }) => (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <MuiLink href="/terms" target="_blank" color="primary">
                      利用規約
                    </MuiLink>
                    と
                    <MuiLink href="/privacy" target="_blank" color="primary">
                      プライバシーポリシー
                    </MuiLink>
                    に同意します
                  </Typography>
                  {errors.acceptTerms && (
                    <Typography variant="caption" color="error">
                      {errors.acceptTerms.message}
                    </Typography>
                  )}
                </Box>
              )}
            />
            
            {isLoading && <LinearProgress sx={{ mt: 2 }} />}
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              loading={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              アカウント作成
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                既にアカウントをお持ちですか？{' '}
                <MuiLink href="/login" color="primary">
                  ログイン
                </MuiLink>
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              登録後、メール認証が必要です
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}