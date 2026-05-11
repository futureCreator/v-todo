type Pattern = number | number[];

function vibrate(pattern: Pattern): void {
  if (typeof navigator === "undefined" || !navigator) return;
  if (typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

export const haptic = {
  selection: () => vibrate(5),
  light: () => vibrate(8),
  tap: () => vibrate(10),
  medium: () => vibrate(15),
  success: () => vibrate([20, 30, 40]),
  warning: () => vibrate([40, 30, 40]),
};
