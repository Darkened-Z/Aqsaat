import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  useEffect(() => {
    // The main app flags itself ready only once it is past "Loading…".
    if (router.pathname !== '/') window.__aqsatReady = true;
    if (!('serviceWorker' in navigator)) return;
    // Register, then actively pull updates so a stale cached shell (which can
    // reference JS chunks a later deploy removed, hanging the app on a phone)
    // is replaced automatically and the page reloads onto the fresh build.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
      reg.update();
      // Installed PWAs resume from memory without navigating, so they never
      // re-check for a new build. Check every time the app comes back on screen.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  }, []);
  return <Component {...pageProps} />;
}
