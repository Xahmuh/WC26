/** Guard division against zero — returns 0 when denominator is 0. */
export function safe(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
