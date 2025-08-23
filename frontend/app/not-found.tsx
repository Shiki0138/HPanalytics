'use client'

import React from 'react'
import { Box, Container, Typography, Button } from '@mui/material'
import { Home } from '@mui/icons-material'
import { useRouter } from 'next/navigation'

export default function NotFoundPage() {
  const router = useRouter()

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
        <Typography variant="h1" component="div" sx={{ fontSize: '6rem', fontWeight: 'bold', mb: 2 }}>
          404
        </Typography>
        <Typography variant="h4" component="h1" gutterBottom>
          ページが見つかりません
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          お探しのページは存在しないか、移動した可能性があります。
        </Typography>
        <Button
          variant="contained"
          startIcon={<Home />}
          onClick={() => router.push('/')}
          size="large"
        >
          ホームに戻る
        </Button>
      </Box>
    </Container>
  )
}