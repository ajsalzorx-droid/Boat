// Turning a flip book's pages with the mouse wheel or a trackpad (src/components/FlipBook.tsx and
// MenuBook.tsx). Down or right is the next page.
//
// A turn is never cut short by the next one: scrolling during a turn waits for it to land. Scrolling
// on (wheel notches) keeps turning one page after the other; one swipe on a trackpad, which keeps
// sending events while it coasts, turns one page.

type Direction = 1 | -1;

const NEW_GESTURE_MS = 250; // a pause this long starts a new scroll
const NOTCH_MS = 40; // a wheel's notches come further apart than a trackpad's events
const START_PX = 60; // scroll needed to turn the first page
const KEEP_MS = 300; // a scroll during a turn counts if it came this shortly before the turn landed

export function wheelTurner({ isTurning, turn }: { isTurning: () => boolean; turn: (direction: Direction) => void }) {
  let gathered = 0;
  let lastTime = -Infinity;
  let lastSize = 0;
  let peak = 0; // the fastest scroll of this swipe
  let fading = false; // and it has slowed down well below that: coasting
  let lastDirection: Direction = 1;
  let turned = false; // this gesture has turned a page
  let waiting: { direction: Direction; time: number } | null = null;
  let timer = 0;

  const waitForTurn = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!waiting) return;
      if (isTurning()) return waitForTurn();
      const { direction, time } = waiting;
      waiting = null;
      if (performance.now() - time <= KEEP_MS) turn(direction);
    }, 16);
  };

  const request = (direction: Direction) => {
    turned = true;
    gathered = 0;
    if (isTurning()) {
      waiting = { direction, time: performance.now() };
      waitForTurn();
    } else {
      waiting = null;
      turn(direction);
    }
  };

  return {
    onWheel(e: WheelEvent) {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
      if (!delta) return;
      const now = performance.now();
      const gap = now - lastTime;
      const size = Math.abs(delta);
      const direction: Direction = delta > 0 ? 1 : -1;

      if (gap > NEW_GESTURE_MS || direction !== lastDirection) {
        gathered = 0;
        turned = false;
        peak = 0;
        fading = false;
      }
      // Later in a gesture that has turned a page: another notch of a wheel, or a new swipe while
      // the last one coasts (the scroll speeds up again instead of fading out)
      const notch = gap >= NOTCH_MS && size >= 40 && size >= lastSize * 0.9;
      const newSwipe = fading && size >= 30 && size > lastSize * 1.5;
      peak = newSwipe ? size : Math.max(peak, size);
      fading = newSwipe ? false : fading || size < peak / 2;

      lastTime = now;
      lastDirection = direction;
      lastSize = turned ? lastSize * 0.5 + size * 0.5 : size;

      if (turned) {
        if (notch || newSwipe) request(direction);
        return;
      }
      gathered += delta;
      if (Math.abs(gathered) >= START_PX) request(direction);
    },
    stop() {
      clearTimeout(timer);
      waiting = null;
    },
  };
}
