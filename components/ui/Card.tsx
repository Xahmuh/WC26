import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...rest }: CardProps): React.JSX.Element {
  return (
    <View
      className={['rounded-2xl border border-bgBorder bg-bgSurface2 p-4', className ?? '']
        .join(' ')
        .trim()}
      {...rest}
    >
      {children}
    </View>
  );
}
