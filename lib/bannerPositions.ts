export const HOME_BANNER_POSITIONS = [
  { key: 'after_top_banner', label: 'After fixed hero banner' },
  { key: 'after_cards_countdown', label: 'After cards and countdown' },
  { key: 'after_my_teams', label: 'After My Teams Matches' },
  { key: 'after_pending_predictions', label: 'After Pending Predictions' },
  { key: 'after_today_matches', label: 'After Today Matches' },
  { key: 'after_performance', label: 'After Performance and Leaderboard' },
  { key: 'before_tournament_questions', label: 'Before Prediction Questions' },
] as const;

export type HomeBannerPosition = (typeof HOME_BANNER_POSITIONS)[number]['key'];

export const DEFAULT_HOME_BANNER_POSITION: HomeBannerPosition = 'after_today_matches';

export function getHomeBannerPositionLabel(position: HomeBannerPosition | string): string {
  return HOME_BANNER_POSITIONS.find((item) => item.key === position)?.label ?? 'After Today Matches';
}
