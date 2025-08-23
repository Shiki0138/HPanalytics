'use client'

import React, { useState, useEffect } from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Badge,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  Analytics,
  Settings,
  Language,
  AccountCircle,
  ExitToApp,
  Security,
  Warning,
  Shield,
  Lock,
  VpnKey,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks'
import { secureLogout } from '@/lib/utils/authUtils'

interface MainLayoutProps {
  children: React.ReactNode
}

const drawerWidth = 240

const menuItems = [
  { text: 'ダッシュボード', icon: <Dashboard />, path: '/dashboard' },
  { text: 'アナリティクス', icon: <Analytics />, path: '/dashboard/analytics' },
  { text: 'ウェブサイト管理', icon: <Language />, path: '/dashboard/websites' },
  { text: '設定', icon: <Settings />, path: '/settings' },
]

export default function MainLayout({ children }: MainLayoutProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [sessionWarning, setSessionWarning] = useState(false)
  
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  const { 
    user, 
    sessionExpiry, 
    isAuthenticated,
    refreshToken 
  } = useAppSelector((state) => state.auth)

  // Session expiry warning
  useEffect(() => {
    if (!sessionExpiry || !isAuthenticated) return

    const checkSessionExpiry = () => {
      const timeRemaining = sessionExpiry - Date.now()
      const fiveMinutes = 5 * 60 * 1000

      if (timeRemaining <= fiveMinutes && timeRemaining > 0) {
        setSessionWarning(true)
      } else {
        setSessionWarning(false)
      }
    }

    const interval = setInterval(checkSessionExpiry, 30000) // Check every 30 seconds
    checkSessionExpiry() // Check immediately

    return () => clearInterval(interval)
  }, [sessionExpiry, isAuthenticated])

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogoutClick = () => {
    setAnchorEl(null)
    setLogoutDialogOpen(true)
  }

  const handleLogoutConfirm = async () => {
    setLogoutDialogOpen(false)
    await secureLogout(dispatch)
  }

  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false)
  }

  const handleSessionExtend = () => {
    setSessionWarning(false)
    // In a real app, you might refresh the token here
    window.location.reload()
  }

  const getSecurityStatus = () => {
    if (!user) return { level: 'unknown', color: 'default' }
    
    let score = 0
    if (user.emailVerified) score += 1
    if (user.mfaEnabled) score += 2
    if (refreshToken) score += 1
    
    if (score >= 4) return { level: 'high', color: 'success' }
    if (score >= 2) return { level: 'medium', color: 'warning' }
    return { level: 'low', color: 'error' }
  }

  const securityStatus = getSecurityStatus()

  const drawer = (
    <Box>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield color="primary" />
          <Typography variant="h6" noWrap component="div">
            Secure Analytics
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      
      {/* Security Status */}
      {user && (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Security fontSize="small" />
            <Typography variant="caption">セキュリティレベル</Typography>
          </Box>
          <Chip
            size="small"
            label={
              securityStatus.level === 'high' ? '高' :
              securityStatus.level === 'medium' ? '中' : '低'
            }
            color={securityStatus.color as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            icon={
              securityStatus.level === 'high' ? <Shield /> :
              securityStatus.level === 'medium' ? <Warning /> : <Lock />
            }
          />
          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
            {user.emailVerified ? '✓ メール認証済' : '✗ メール未認証'}
            <br />
            {user.mfaEnabled ? '✓ MFA有効' : '✗ MFA無効'}
          </Typography>
        </Box>
      )}
      
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                router.push(item.path)
                if (isMobile) {
                  setMobileOpen(false)
                }
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {/* Page title can be dynamic */}
          </Typography>
          
          {/* Session Warning */}
          {sessionWarning && (
            <Tooltip title="セッションまもなく期限切れ">
              <IconButton
                color="inherit"
                onClick={handleSessionExtend}
                sx={{ mr: 1 }}
              >
                <Badge color="error" variant="dot">
                  <Warning />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          
          {/* Security Status Indicator */}
          <Tooltip title={`セキュリティレベル: ${securityStatus.level === 'high' ? '高' : securityStatus.level === 'medium' ? '中' : '低'}`}>
            <IconButton color="inherit" sx={{ mr: 1 }}>
              {securityStatus.level === 'high' ? <Shield color="inherit" /> :
               securityStatus.level === 'medium' ? <Security color="inherit" /> :
               <Lock color="inherit" />}
            </IconButton>
          </Tooltip>
          
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenuClick}
            color="inherit"
          >
            {user ? (
              <Avatar sx={{ width: 32, height: 32 }}>{user.name[0]}</Avatar>
            ) : (
              <AccountCircle />
            )}
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { handleMenuClose(); router.push('/settings/profile') }}>
              <AccountCircle sx={{ mr: 1 }} /> プロフィール
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); router.push('/settings/security') }}>
              <Security sx={{ mr: 1 }} /> セキュリティ設定
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); router.push('/settings/mfa') }}>
              <VpnKey sx={{ mr: 1 }} /> 二段階認証
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogoutClick}>
              <ExitToApp sx={{ mr: 1 }} /> セキュアログアウト
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
      
      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Security color="warning" />
            セキュアログアウト
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            ログアウトしますか？すべてのセッション情報が安全に削除されます。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel} color="primary">
            キャンセル
          </Button>
          <Button onClick={handleLogoutConfirm} color="error" variant="contained">
            ログアウト
          </Button>
        </DialogActions>
      </Dialog>

      {/* Session Warning Dialog */}
      <Dialog
        open={sessionWarning}
        onClose={() => setSessionWarning(false)}
        aria-labelledby="session-dialog-title"
        aria-describedby="session-dialog-description"
      >
        <DialogTitle id="session-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" />
            セッション期限警告
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="session-dialog-description">
            セッションが間もなく期限切れになります。継続しますか？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionWarning(false)} color="primary">
            後で
          </Button>
          <Button onClick={handleSessionExtend} color="primary" variant="contained">
            セッション延長
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}