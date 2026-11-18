import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme */}
        <meta name="theme-color" content="#0f6b4b" />

        {/* iOS Safari — standalone mode */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Aqsat" />

        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* Self-heal: if a stale cached build keeps the app from starting (stuck on
            "Loading…"), drop the service worker + caches and reload once.
            Never touches localStorage, so data and saved login survive. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){
  function reset(){
    try{sessionStorage.setItem('aqsat_reset','1')}catch(e){}
    var p=[];
    if('serviceWorker' in navigator)p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));
    if(window.caches)p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}));
    Promise.all(p).catch(function(){}).then(function(){location.replace(location.pathname)});
  }
  if(/[?&]reset=1/.test(location.search)){reset();return;}
  setTimeout(function(){
    if(window.__aqsatReady)return;
    var done=false;try{done=sessionStorage.getItem('aqsat_reset')==='1'}catch(e){}
    if(!done)reset();
  },15000);
})();` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
