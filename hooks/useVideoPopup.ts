import { useCallback, useEffect, useState } from 'react';

import { useAuthStore } from '@/stores/auth.store';

interface UseVideoPopupReturn {
  isVisible: boolean;
  dismiss: () => void;
}

/**
 * Shows the branding video popup on Home every time the user freshly signs in
 * (not on app-relaunch with a restored session). Driven by `justSignedIn` in
 * the auth store, which is only set on Supabase's `SIGNED_IN` event. The
 * popup is marked as seen once per login session so it cannot reopen again
 * until the user signs out and back in.
 */
export function useVideoPopup(): UseVideoPopupReturn {
  const justSignedIn = useAuthStore((s) => s.justSignedIn);
  const hasSeenBrandingVideo = useAuthStore((s) => s.hasSeenBrandingVideo);
  const consumeJustSignedIn = useAuthStore((s) => s.consumeJustSignedIn);
  const markBrandingVideoSeen = useAuthStore((s) => s.markBrandingVideoSeen);
  const [isVisible, setIsVisible] = useState(() => justSignedIn && !hasSeenBrandingVideo);

  useEffect(() => {
    if (justSignedIn && !hasSeenBrandingVideo) {
      setIsVisible(true);
      markBrandingVideoSeen();
      // Reset immediately so the popup doesn't reappear on re-renders/remounts
      // until the next genuine sign-in.
      consumeJustSignedIn();
    } else if (justSignedIn) {
      consumeJustSignedIn();
    }
  }, [justSignedIn, hasSeenBrandingVideo, consumeJustSignedIn, markBrandingVideoSeen]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  return { isVisible, dismiss };
}
