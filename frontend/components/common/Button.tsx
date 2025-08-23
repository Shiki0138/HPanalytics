import React from 'react'
import { Button as MuiButton, ButtonProps, CircularProgress } from '@mui/material'

interface CustomButtonProps extends ButtonProps {
  loading?: boolean
}

export default function Button({ loading, disabled, children, ...props }: CustomButtonProps) {
  return (
    <MuiButton disabled={loading || disabled} {...props}>
      {loading ? <CircularProgress size={24} color="inherit" /> : children}
    </MuiButton>
  )
}