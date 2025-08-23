'use client'

import React from 'react'
import { Typography, Box } from '@mui/material'
import MainLayout from '@/components/layout/MainLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import Card from '@/components/common/Card'

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            設定
          </Typography>
          <Typography variant="body1" color="text.secondary">
            アプリケーションの設定を管理
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            mb: 3,
          }}
        >
          <Card title="プロフィール設定">
            <Typography variant="body2" color="text.secondary">
              プロフィール設定画面がここに表示されます
            </Typography>
          </Card>
          
          <Card title="通知設定">
            <Typography variant="body2" color="text.secondary">
              通知設定画面がここに表示されます
            </Typography>
          </Card>
        </Box>

        <Card title="API設定">
          <Typography variant="body2" color="text.secondary">
            API設定画面がここに表示されます
          </Typography>
        </Card>
      </MainLayout>
    </ProtectedRoute>
  )
}