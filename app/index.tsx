import { Redirect } from 'expo-router';

// Entry point. The protected-route guard in app/_layout.tsx redirects to the
// auth stack when there is no session, so sending everyone to the tabs first
// is safe.
export default function Index(): React.JSX.Element {
  return <Redirect href="/(tabs)/home" />;
}
