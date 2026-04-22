import { Appearance } from 'react-native';

// ─── Colors ─────────────────────────────────────────────────────────────────
export const Colors = {
    // Brand
    saffron: '#FF9933',
    saffronLight: '#FFB366',
    saffronDark: '#E6851A',
    maroon: '#800000',
    maroonLight: '#A33333',
    cream: '#FFF8F0',

    // Veg / Non-Veg
    vegGreen: '#008000',
    nonVegRed: '#CC0000',

    // Neutrals
    white: '#FFFFFF',
    black: '#000000',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',

    // Semantic
    success: '#16A34A',
    error: '#DC2626',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Table Status
    tableAvailable: '#16A34A',
    tableOccupied: '#DC2626',
    tableReserved: '#F59E0B',

    // Payment modes
    cash: '#16A34A',
    card: '#3B82F6',
    upi: '#8B5CF6',

    // KDS Dark
    kdsBg: '#0F0F0F',
    kdsCard: '#1A1A1A',
    kdsText: '#E5E5E5',
    kdsPending: '#EF4444',
    kdsPreparing: '#F59E0B',
    kdsReady: '#22C55E',
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────
export const Spacing = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
export const FontSize = {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 36,
} as const;

export const FontWeight = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
};

// ─── Border Radius ──────────────────────────────────────────────────────────
export const Radius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
} as const;

// ─── Light / Dark Theme ─────────────────────────────────────────────────────
export interface ThemeColors {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    primary: string;
    primaryText: string;
}

export const LightTheme: ThemeColors = {
    background: Colors.cream,
    surface: Colors.white,
    text: Colors.gray900,
    textSecondary: Colors.gray500,
    border: Colors.gray200,
    primary: Colors.saffron,
    primaryText: Colors.white,
};

export const DarkTheme: ThemeColors = {
    background: Colors.gray900,
    surface: Colors.gray800,
    text: Colors.gray100,
    textSecondary: Colors.gray400,
    border: Colors.gray700,
    primary: Colors.saffron,
    primaryText: Colors.white,
};

// Kitchen ALWAYS uses dark
export const KitchenTheme: ThemeColors = {
    background: Colors.kdsBg,
    surface: Colors.kdsCard,
    text: Colors.kdsText,
    textSecondary: Colors.gray400,
    border: Colors.gray700,
    primary: Colors.saffron,
    primaryText: Colors.white,
};

export function getTheme(forceKitchen = false): ThemeColors {
    if (forceKitchen) return KitchenTheme;
    const scheme = Appearance.getColorScheme();
    return scheme === 'dark' ? DarkTheme : LightTheme;
}
