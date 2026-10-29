/**
 * Ziezan Quran — Service Worker Background Prayer Schedule & Adzan Notifier
 * Monitors user's configured location prayer schedule in the background and
 * triggers OS notifications + signals background/open clients to play Adzan & prayer audio.
 */

const SW_DB_NAME = 'ziezan_sw_shalat_v1';
const SW_STORE_NAME = 'schedule_state';
const SW_STATE_KEY = 'active_schedule';

let cachedScheduleState = null;

function openSwDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(SW_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_STORE_NAME)) {
          db.createObjectStore(SW_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveSwScheduleState(state) {
  cachedScheduleState = state;
  const db = await openSwDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE_NAME, 'readwrite');
      tx.objectStore(SW_STORE_NAME).put(state, SW_STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function loadSwScheduleState() {
  if (cachedScheduleState) return cachedScheduleState;
  const db = await openSwDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(SW_STORE_NAME, 'readonly');
      const req = tx.objectStore(SW_STORE_NAME).get(SW_STATE_KEY);
      req.onsuccess = () => {
        cachedScheduleState = req.result || null;
        resolve(cachedScheduleState);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

const PRAYER_META = {
  imsak: { label: 'Imsak', category: 'imsak' },
  subuh: { label: 'Subuh', category: 'subuh' },
  terbit: { label: 'Terbit', category: 'terbit' },
  dhuha: { label: 'Duha', category: 'adzan' },
  dzuhur: { label: 'Zuhur', category: 'adzan' },
  ashar: { label: 'Asar', category: 'adzan' },
  maghrib: { label: 'Magrib', category: 'adzan' },
  isya: { label: 'Isya', category: 'adzan' },
};

const PRAYER_ORDER_KEYS = [
  'imsak',
  'subuh',
  'terbit',
  'dhuha',
  'dzuhur',
  'ashar',
  'maghrib',
  'isya',
];

function getLocalDateIso(now) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function evaluateAndNotifyBackground() {
  try {
    const state = await loadSwScheduleState();
    if (!state || !state.settings || !state.settings.enabled) return;

    const now = new Date();
    const todayIso = getLocalDateIso(now);
    const activeRow =
      state.todayRow && state.todayRow.tanggal_lengkap === todayIso
        ? state.todayRow
        : state.tomorrowRow && state.tomorrowRow.tanggal_lengkap === todayIso
          ? state.tomorrowRow
          : state.todayRow;

    if (!activeRow) return;

    const nowTotalMins = now.getHours() * 60 + now.getMinutes();
    const leadMinutes = Number(state.settings.leadMinutes || 0);
    const provinsi = (state.provinsi || 'Banten').trim();
    const kabkota = (state.kabkota || 'Kab. Serang').trim();
    const triggeredMap = state.triggeredEvents || {};

    for (const key of PRAYER_ORDER_KEYS) {
      if (!state.settings.prayers || !state.settings.prayers[key]) continue;
      const timeStr = activeRow[key];
      if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) continue;

      const parts = timeStr.split(':').map(Number);
      const hh = parts[0];
      const mm = parts[1];
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;

      const prayerMins = hh * 60 + mm;
      const triggerMins = (prayerMins - leadMinutes + 1440) % 1440;
      const diffMins = (nowTotalMins - triggerMins + 1440) % 1440;

      // Allow 0..3 minute window for background wakeups
      if (diffMins < 0 || diffMins > 3) continue;

      const slotKey = `${todayIso}|${provinsi.toLowerCase()}|${kabkota.toLowerCase()}|${key}|lead:${leadMinutes}`;
      if (triggeredMap[slotKey]) continue;

      // Mark triggered
      triggeredMap[slotKey] = Date.now();
      state.triggeredEvents = triggeredMap;
      await saveSwScheduleState(state);

      const meta = PRAYER_META[key] || { label: key, category: 'adzan' };
      const title =
        leadMinutes === 0
          ? `Waktu ${meta.label} (${timeStr}) — ${kabkota}`
          : `${leadMinutes} Menit Menuju ${meta.label} (${timeStr}) — ${kabkota}`;

      const body =
        leadMinutes === 0
          ? `Saatnya menunaikan ibadah ${meta.label} untuk wilayah ${kabkota}, ${provinsi}. Kumandang suara pengingat diputar otomatis.`
          : `Persiapan memasuki waktu ${meta.label} (${timeStr}) untuk wilayah ${kabkota}, ${provinsi}.`;

      const triggerPayload = {
        prayerKey: key,
        prayerLabel: meta.label,
        category: meta.category,
        scheduledTime: timeStr,
        provinsi,
        kabkota,
        slotKey,
        message: body,
      };

      // 1. Broadcast to any open or background window clients to immediately play Adzan audio
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        try {
          client.postMessage({
            type: 'SW_TRIGGER_ADZAN_AUDIO',
            payload: triggerPayload,
          });
        } catch {
          // Ignore client message errors
        }
      }

      // 2. Display persistent system notification with vibration & sound actions
      if (self.registration && typeof self.registration.showNotification === 'function') {
        await self.registration.showNotification(`Ziezan Quran · ${title}`, {
          body,
          icon: '/icons/ziezan-quran.png',
          badge: '/icons/ziezan-quran.png',
          tag: slotKey,
          renotify: true,
          requireInteraction: true,
          silent: false,
          vibrate: [300, 120, 300, 120, 450],
          data: triggerPayload,
          actions: [
            { action: 'play-adzan', title: 'Putar Adzan' },
            { action: 'stop-adzan', title: 'Hentikan Suara' },
          ],
        });
      }
      break;
    }
  } catch {
    // Ignore background evaluation errors
  }
}

// Listen for schedule sync & manual check messages from main thread
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SYNC_SHALAT_SCHEDULE' && data.payload) {
    event.waitUntil(
      (async () => {
        const existing = await loadSwScheduleState();
        const mergedTriggered = {
          ...(existing && existing.triggeredEvents ? existing.triggeredEvents : {}),
          ...(data.payload.triggeredEvents || {}),
        };
        await saveSwScheduleState({
          ...data.payload,
          triggeredEvents: mergedTriggered,
          updatedAt: Date.now(),
        });
        await evaluateAndNotifyBackground();
      })()
    );
  } else if (data.type === 'CHECK_SHALAT_NOW') {
    event.waitUntil(evaluateAndNotifyBackground());
  }
});

// Periodic Background Sync support (Chromium / Android Installed PWA)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'ziezan-shalat-check') {
    event.waitUntil(evaluateAndNotifyBackground());
  }
});

// One-off Background Sync support
self.addEventListener('sync', (event) => {
  if (event.tag === 'ziezan-shalat-check') {
    event.waitUntil(evaluateAndNotifyBackground());
  }
});

// Handle Notification Click & Action Buttons
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const payload = (notification && notification.data) || {};
  notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      if (action === 'stop-adzan') {
        for (const client of allClients) {
          client.postMessage({ type: 'SW_STOP_ADZAN_AUDIO' });
        }
        return;
      }

      if (allClients.length > 0) {
        const targetClient = allClients[0];
        if ('focus' in targetClient) {
          await targetClient.focus();
        }
        targetClient.postMessage({
          type: 'SW_TRIGGER_ADZAN_AUDIO',
          payload,
        });
        return;
      }

      if (self.clients.openWindow) {
        const category = encodeURIComponent(payload.category || 'adzan');
        const prayerKey = encodeURIComponent(payload.prayerKey || 'subuh');
        await self.clients.openWindow(
          `/shalat/?autoPlayAdzan=${category}&prayer=${prayerKey}`
        );
      }
    })()
  );
});

// Background interval inside Service Worker while alive
setInterval(() => {
  void evaluateAndNotifyBackground();
}, 15000);
