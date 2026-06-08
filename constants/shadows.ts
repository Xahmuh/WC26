import { Platform } from 'react-native';

export const Shadows = {
  card: Platform.select({
    web: { boxShadow: '0 0 8px rgba(215, 217, 94, 0.1)' },
    ios: {
      shadowColor: '#d7d95e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  cardStrong: Platform.select({
    web: { boxShadow: '0 0 12px rgba(215, 217, 94, 0.2)' },
    ios: {
      shadowColor: '#d7d95e',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  bottomNav: Platform.select({
    web: { boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.4)' },
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    android: {
      elevation: 16,
    },
  }),
} as const;
