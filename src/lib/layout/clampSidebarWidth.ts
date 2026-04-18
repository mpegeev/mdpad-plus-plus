export const SIDEBAR_MIN = 160;
export const SIDEBAR_MAX = 480;
export const SIDEBAR_DEFAULT = 240;

export function clampSidebarWidth(
  width: number,
  min: number = SIDEBAR_MIN,
  max: number = SIDEBAR_MAX,
): number {
  if (Number.isNaN(width)) return min;
  return Math.min(Math.max(width, min), max);
}
