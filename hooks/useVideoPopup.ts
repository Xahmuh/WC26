import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth.store';

interface UseVideoPopupReturn {
  isVisible: boolean;
  dismiss: () => void;
}

/**
 * Shows the branding video popup on Home every time the user freshly signs in
 * (not on app-relaunch with a restored session). Driven by `justSignedIn` in
 * the auth store, which is only set on Supabase's `SIGNED_IN` event.
 */
export function useVideoPopup(): UseVideoPopupReturn {
  const justSignedIn = useAuthStore((s) => s.justSignedIn);
  const consumeJustSignedIn = useAuthStore((s) => s.consumeJustSignedIn);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (justSignedIn) {
      setIsVisible(true);
      // Reset immediately so the popup doesn't reappear on re-renders/remounts
      // until the next genuine sign-in.
      consumeJustSignedIn();
    }
  }, [justSignedIn, consumeJustSignedIn]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return { isVisible, dismiss };
}
