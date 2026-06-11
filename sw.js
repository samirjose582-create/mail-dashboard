// ── Mail Dashboard Service Worker ─────────────────────────────────────────────
const CACHE = 'mail-dashboard-v6';
// Paths relativos ao scope do SW (funciona em localhost E GitHub Pages)
const CACHE_URLS = ['./Relatorio_email.html', './manifest.json', './icon.svg'];

// ── Install: pré-cacheia os ficheiros estáticos ──────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CACHE_URLS)).catch(err => console.warn('SW cache fail:', err))
  );
  self.skipWaiting();
});

// ── Activate: remove caches antigos ─────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: Network-first para HTML; skip para chamadas API ──────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Nunca interceptar chamadas Microsoft (API, OAuth)
  if (url.includes('graph.microsoft.com') ||
      url.includes('login.microsoftonline.com') ||
      url.includes('microsoftonline.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('cdn.jsdelivr.net')) {
    return; // deixa o browser lidar normalmente
  }

  // Para os ficheiros locais: Network first, cache como fallback
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Actualiza cache com a versão mais recente
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sem rede? Serve do cache (modo offline)
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback para o HTML principal (scope-relative)
          if (e.request.destination === 'document') {
            return caches.match(self.registration.scope + 'Relatorio_email.html');
          }
        });
      })
  );
});
