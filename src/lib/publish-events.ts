// "published" event from the SEO Studio's Confirm & Publish button.
//
// The server side of a publish is publishSite() (expires the cache tags). This browser-side
// emitter tells other open tabs in the same browser (website tabs, other studio tabs) so they
// fetch the new values without a manual reload.
const CHANNEL = "boat-seafood-site";

// Identifies this tab, so a listener can skip the event its own tab sent
const TAB_ID = Math.random().toString(36).slice(2);

type PublishedEvent = { type: "published"; at: number; from: string };

export function emitPublished() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL);
  channel.postMessage({ type: "published", at: Date.now(), from: TAB_ID } satisfies PublishedEvent);
  channel.close();
}

// Returns an unsubscribe function (use it as a useEffect cleanup)
export function onPublished(listener: () => void, { ignoreOwnTab = false } = {}) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (e: MessageEvent<PublishedEvent>) => {
    if (e.data?.type !== "published") return;
    if (ignoreOwnTab && e.data.from === TAB_ID) return;
    listener();
  };
  return () => channel.close();
}
