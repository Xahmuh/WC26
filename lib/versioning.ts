function parseVersionPart(value: string): number {
  const parsed = Number.parseInt(value.replace(/[^\d].*$/, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareVersions(current: string, target: string): number {
  const currentParts = current.trim().split('.').map(parseVersionPart);
  const targetParts = target.trim().split('.').map(parseVersionPart);
  const length = Math.max(currentParts.length, targetParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const targetPart = targetParts[index] ?? 0;
    if (currentPart > targetPart) return 1;
    if (currentPart < targetPart) return -1;
  }

  return 0;
}

export function isVersionOlderThan(current: string, minimum: string): boolean {
  return compareVersions(current, minimum) < 0;
}
