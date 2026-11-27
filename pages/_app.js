import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Phones: lay the app out wider and scale it to fit, so every screen shows more
// rows. Scaling the viewport (not CSS zoom) keeps fixed bars and 100vh correct.
// maximum-scale stops iOS zooming in on focused inputs.
const PHONE_SCALE = 0.86;
function phoneViewport() {
  const s = window.screen;
  if (Math.min(s.width, s.height) >= 600) return null;
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  const w = landscape ? Math.max(s.width, s.height) : Math.min(s.width, s.height);
  return `width=${Math.round(w / PHONE_SCALE)}, initial-scale=${PHONE_SCALE}, maximum-scale=${PHONE_SCALE}`;
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const set = () => setViewport(phoneViewport());
    set();
    window.addEventListener('orientationchange', set);
    return () => window.removeEventListener('orientationchange', set);
  }, []);
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
  return <>
    {viewport && <Head><meta name="viewport" content={viewport} /></Head>}
    <Component {...pageProps} />
  </>;
}
