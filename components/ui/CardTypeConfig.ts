import { Colors } from '@/constants';
import { type IconName } from '@/components/ui/Icon';

export type CardType = 'joker' | 'sniper' | 'shield';

export const CARD_TYPE_CONFIG: Record<
  CardType,
  {
    label: string;
    borderColor: string;
    iconColor: string;
    backgroundColor: string;
    icon: IconName;
  }
> = {
  joker: {
    label: 'JOKER',
    borderColor: '#8B6A3D',
    iconColor: '#E2C07A',
    backgroundColor: Colors.background.cardAlt,
    icon: 'sparkles',
  },
  sniper: {
    label: 'SNIPER',
    borderColor: Colors.accent.lime,
    iconColor: Colors.accent.lime,
    backgroundColor: Colors.background.cardAlt,
    icon: 'target',
  },
  shield: {
    label: 'SHIELD',
    borderColor: Colors.blue,
    iconColor: '#8DB3FF',
    backgroundColor: Colors.background.cardAlt,
    icon: 'shield',
  },
} as const;

