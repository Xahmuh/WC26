import { ActivityIndicator, Image, Pressable, Text } from 'react-native';

interface GoogleButtonProps {
  onPress: () => void;
  loading?: boolean;
  label?: string;
  disabled?: boolean;
}

export function GoogleButton({
  onPress,
  loading = false,
  label = 'Continue with Google',
  disabled = false,
}: GoogleButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={`h-12 w-full flex-row items-center justify-center rounded-full bg-white px-6 active:opacity-90 ${
        isDisabled ? 'opacity-50' : ''
      }`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" />
      ) : (
        <>
          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.png',
            }}
            style={{ width: 20, height: 20, marginRight: 12 }}
            resizeMode="contain"
          />
          <Text className="text-base font-semibold text-[#1f1f1f]">
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
