import { createTheme, PaletteMode } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'

// Define common theme properties
const getDesignTokens = (mode: PaletteMode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode palette
          primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#dc004e',
            light: '#e33371',
            dark: '#9a0036',
            contrastText: '#ffffff',
          },
          success: {
            main: '#2e7d32',
            light: '#4caf50',
            dark: '#1b5e20',
          },
          warning: {
            main: '#ed6c02',
            light: '#ff9800',
            dark: '#e65100',
          },
          error: {
            main: '#d32f2f',
            light: '#ef5350',
            dark: '#c62828',
          },
          info: {
            main: '#0288d1',
            light: '#03a9f4',
            dark: '#01579b',
          },
          background: {
            default: '#fafafa',
            paper: '#ffffff',
          },
          text: {
            primary: '#1a1a1a',
            secondary: '#666666',
          },
          divider: alpha('#000000', 0.08),
          grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
          },
        }
      : {
          // Dark mode palette
          primary: {
            main: '#90caf9',
            light: '#bbdefb',
            dark: '#42a5f5',
            contrastText: '#000000',
          },
          secondary: {
            main: '#f48fb1',
            light: '#f8bbd9',
            dark: '#f06292',
            contrastText: '#000000',
          },
          success: {
            main: '#66bb6a',
            light: '#81c784',
            dark: '#4caf50',
          },
          warning: {
            main: '#ffa726',
            light: '#ffb74d',
            dark: '#ff9800',
          },
          error: {
            main: '#f44336',
            light: '#e57373',
            dark: '#d32f2f',
          },
          info: {
            main: '#29b6f6',
            light: '#4fc3f7',
            dark: '#03a9f4',
          },
          background: {
            default: '#0a0a0a',
            paper: '#1a1a1a',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
          },
          divider: alpha('#ffffff', 0.08),
          grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
            600: '#757575',
            700: '#616161',
            800: '#424242',
            900: '#212121',
          },
        }),
  },
})

// Create theme based on mode
export const createAppTheme = (mode: PaletteMode) =>
  createTheme({
    ...getDesignTokens(mode),
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
      ].join(','),
      h1: {
        fontSize: '3rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2.25rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.875rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '0.03em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    spacing: 8,
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            scrollbarWidth: 'thin',
            scrollbarColor: mode === 'dark' ? '#424242 #1a1a1a' : '#bdbdbd #f5f5f5',
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              background: mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'dark' ? '#424242' : '#bdbdbd',
              borderRadius: 4,
              '&:hover': {
                background: mode === 'dark' ? '#616161' : '#9e9e9e',
              },
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            padding: '10px 24px',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: `0 4px 12px ${alpha(mode === 'dark' ? '#90caf9' : '#1976d2', 0.3)}`,
            },
          },
          contained: {
            boxShadow: `0 2px 8px ${alpha(mode === 'dark' ? '#90caf9' : '#1976d2', 0.2)}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            background: mode === 'dark' 
              ? 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            boxShadow: mode === 'dark'
              ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(255, 255, 255, 0.05)'
              : '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)',
            border: mode === 'dark' 
              ? `1px solid ${alpha('#ffffff', 0.05)}`
              : `1px solid ${alpha('#000000', 0.02)}`,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: mode === 'dark'
                ? '0 8px 30px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(255, 255, 255, 0.08)'
                : '0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: mode === 'dark'
              ? alpha('#1a1a1a', 0.8)
              : alpha('#ffffff', 0.8),
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${alpha(mode === 'dark' ? '#ffffff' : '#000000', 0.08)}`,
            boxShadow: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: mode === 'dark'
              ? alpha('#1a1a1a', 0.95)
              : alpha('#ffffff', 0.95),
            backdropFilter: 'blur(20px)',
            border: 'none',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? alpha('#ffffff', 0.9) : alpha('#000000', 0.9),
            color: mode === 'dark' ? '#000000' : '#ffffff',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
          },
        },
      },
    },
  })

// Export default light theme for backwards compatibility
export const theme = createAppTheme('light')

// Export both light and dark themes
export const lightTheme = createAppTheme('light')
export const darkTheme = createAppTheme('dark')