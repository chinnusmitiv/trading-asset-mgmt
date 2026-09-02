/**
 * Design System Tokens & Color Palette
 */

export const THEME = {
  colors: {
    background: {
      primary: '#0B0F19',
      secondary: '#111827',
      card: '#161F36',
      cardElevated: '#1E293B',
      input: '#1A233A',
      border: '#2A364F',
      divider: 'rgba(255, 255, 255, 0.08)'
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
      muted: '#64748B',
      inverse: '#0B0F19'
    },
    accent: {
      emerald: '#10B981', // Profit, Positive, Paid
      cyan: '#06B6D4',    // Capital, Trading, Info
      amber: '#F59E0B',   // Warning, Pending, Approvals
      rose: '#F43F5E',    // Loss, Danger, Rejected
      indigo: '#6366F1',  // Management, Primary, Accents
      purple: '#A855F7'   // Special indicators
    }
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System'
    },
    fontSize: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      xxl: 24,
      display: 32
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999
  }
};
