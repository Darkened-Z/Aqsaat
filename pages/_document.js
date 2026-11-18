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

        {/* Self-heal, all without touching saved data or login:
            - every new deploy wipes the phone's cached copy of the app (server-driven)
            - /?reset=1 wipes it on demand
            - if the app is still on "Loading…" after 20s, wipe once and reload,
              and if it is still stuck after that, print the error on screen */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){
  var BUILD='${process.env.NEXT_PUBLIC_BUILD_ID}';
  window.__aqsatErrs=[];
  window.addEventListener('error',function(e){window.__aqsatErrs.push(String(e.message||e.error))});
  window.addEventListener('unhandledrejection',function(e){window.__aqsatErrs.push('promise: '+String(e.reason&&e.reason.message||e.reason))});
  function wipe(){
    var p=[];
    if('serviceWorker' in navigator)p.push(navigator.serviceWorker.getRegistrations().then(function(rs){return Promise.all(rs.map(function(r){return r.unregister()}))}));
    if(window.caches)p.push(caches.keys().then(function(ks){return Promise.all(ks.map(function(k){return caches.delete(k)}))}));
    return Promise.all(p).catch(function(){});
  }
  function reset(){try{sessionStorage.setItem('aqsat_reset','1')}catch(e){}wipe().then(function(){location.replace(location.pathname)})}
  if(/[?&]reset=1/.test(location.search)){reset();return;}
  try{var last=localStorage.getItem('aqsat_build');if(last!==BUILD){localStorage.setItem('aqsat_build',BUILD);if(last){wipe();}}}catch(e){}
  setTimeout(function(){
    if(window.__aqsatReady)return;
    var done=false;try{done=sessionStorage.getItem('aqsat_reset')==='1'}catch(e){}
    if(!done){reset();return;}
    var d=document.createElement('div');
    d.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;padding:12px;background:#fff3f3;border:1px solid #d93b3b;border-radius:10px;font:12px monospace;color:#7a1f1f;z-index:99999;word-break:break-word';
    d.textContent='Still loading. Screenshot this and send it: '+(window.__aqsatErrs.join(' | ')||'no error; network/auth slow')+' | '+navigator.userAgent;
    document.body.appendChild(d);
  },20000);
})();` }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
