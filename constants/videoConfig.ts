// ============================================================================
// Branding video popup — config
// ----------------------------------------------------------------------------
// Controls the branding video shown on the Home screen every time the user
// freshly signs in (see hooks/useVideoPopup.ts + stores/auth.store.ts).
// ============================================================================

export const VIDEO_CONFIG = {
  /**
   * Source priority:
   *   1. remoteUrl (e.g. Supabase Storage public URL) — takes precedence when set
   *   2. localAsset — bundled MP4 fallback
   */
  remoteUrl: null as string | null,
  // Example future value:
  // remoteUrl: "https://xxxx.supabase.co/storage/v1/object/public/branding/intro_v1.mp4",

  localAsset: require('@/assets/Videos/vid.mp4'),
} as const;
