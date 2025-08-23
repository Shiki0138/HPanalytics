'use client'

import React from 'react'
import { Box, Container, Typography, Button, Alert } from '@mui/material'
import { Refresh } from '@mui/icons-material'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          エラーが発生しました
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          申し訳ございませんが、予期しないエラーが発生しました。
        </Typography>
        
        {error.message && (
          <Alert severity="error" sx={{ mb: 3, maxWidth: '500px' }}>
            {error.message}
          </Alert>
        )}
        
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={reset}
          size="large"
        >
          再試行
        </Button>
      </Box>
    </Container>
  )
}