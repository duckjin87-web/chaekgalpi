export const spineColors = [
  "#8B5E3C",
  "#3C6E71",
  "#A83232",
  "#4A4E69",
  "#B08968",
  "#2F6690",
  "#6A4C93",
  "#577590",
] as const;

export function randomSpineColor(): string {
  return spineColors[Math.floor(Math.random() * spineColors.length)];
}
