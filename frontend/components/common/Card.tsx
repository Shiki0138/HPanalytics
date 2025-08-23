import React from 'react'
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Box,
} from '@mui/material'

interface CardProps {
  title?: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  elevation?: number
}

export default function Card({ title, subtitle, children, actions, elevation = 1 }: CardProps) {
  return (
    <MuiCard elevation={elevation}>
      {(title || subtitle) && (
        <CardHeader
          title={title && <Typography variant="h6">{title}</Typography>}
          subheader={subtitle && <Typography variant="body2">{subtitle}</Typography>}
        />
      )}
      <CardContent>
        <Box>{children}</Box>
      </CardContent>
      {actions && <CardActions>{actions}</CardActions>}
    </MuiCard>
  )
}