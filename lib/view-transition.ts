type Updater = () => void;

type DocWithViewTransition = {
  startViewTransition?: (updater: Updater) => { finished: Promise<void> };
};

export function withViewTransition(updater: Updater): void {
  if (typeof document === "undefined" || !document) {
    updater();
    return;
  }
  const doc = document as unknown as DocWithViewTransition;
  if (typeof doc.startViewTransition !== "function") {
    updater();
    return;
  }
  doc.startViewTransition(updater);
}
