import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    // Register, then actively pull updates so a stale cached shell (which can
    // reference JS chunks a later deploy removed, hanging the app on a phone)
    // is replaced automatically and the page reloads onto the fresh build.
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.update();
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
