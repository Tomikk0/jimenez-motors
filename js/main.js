// === JAVÍTOTT HALLOWEEN THEME FUNKCIÓK ===

// Halloween theme toggle
function toggleHalloweenTheme() {
    const body = document.body;
    const isHalloween = body.classList.contains('halloween-theme');

    if (isHalloween) {
        body.classList.remove('halloween-theme');
        localStorage.setItem('halloweenTheme', 'false');
        removeHalloweenDecorations();
        console.log('🎃 Halloween theme kikapcsolva');
    } else {
        body.classList.add('halloween-theme');
        localStorage.setItem('halloweenTheme', 'true');
        addHalloweenDecorations();
        console.log('🎃 Halloween theme bekapcsolva');
    }

    syncHalloweenTheme();
}

// Halloween dekorációk hozzáadása
function addHalloweenDecorations() {
    if (!document.body.classList.contains('halloween-theme')) return;
    if (document.querySelector('.halloween-decoration')) return;
    
    const decorations = ['🎃', '👻', '🦇', '🕷️', '🕸️', '💀'];
    const body = document.body;
    
    for (let i = 0; i < 15; i++) {
        const deco = document.createElement('div');
        deco.className = 'halloween-decoration halloween-float';
        deco.textContent = decorations[Math.floor(Math.random() * decorations.length)];
        deco.style.left = Math.random() * 100 + 'vw';
        deco.style.top = Math.random() * 100 + 'vh';
        deco.style.fontSize = (Math.random() * 2 + 1) + 'em';
        deco.style.opacity = Math.random() * 0.3 + 0.1;
        deco.style.animationDelay = Math.random() * 5 + 's';
        body.appendChild(deco);
    }
}

// Dekorációk eltávolítása
function removeHalloweenDecorations() {
    const decorations = document.querySelectorAll('.halloween-decoration');
    decorations.forEach(deco => {
        deco.remove();
    });
}

// Halloween theme betöltése
function loadHalloweenTheme() {
    const savedTheme = localStorage.getItem('halloweenTheme');
    if (savedTheme === 'true') {
        document.body.classList.add('halloween-theme');
        console.log('🎃 Halloween theme betöltve');
    }

    syncHalloweenTheme();
}

// Toggle gomb hozzáadása
function addHalloweenToggle() {
    if (document.querySelector('.halloween-toggle')) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'halloween-toggle';
    toggleBtn.innerHTML = '🎃';
    toggleBtn.title = 'Halloween Theme Kapcsoló';
    toggleBtn.onclick = toggleHalloweenTheme;
    document.body.appendChild(toggleBtn);
}
function syncHalloweenTheme() {
    if (document.body.classList.contains('halloween-theme')) {
        addHalloweenDecorations();
    } else {
        removeHalloweenDecorations();
    }
}

const halloweenObserver = new MutationObserver(function(mutations) {
    for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
            syncHalloweenTheme();
            break;
        }
    }
});

halloweenObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
});

document.addEventListener('DOMContentLoaded', function() {
    addHalloweenToggle();
    loadHalloweenTheme();
    syncHalloweenTheme();
});
// === OLDAL KEZELÉS ===
function showPage(pageName) {
  try {
    console.log('🔄 Oldalváltás:', pageName);
    
    // Ellenőrizzük, hogy az oldal elérhető-e
    const adminPages = ['statisztika', 'autokKepek', 'tuningok', 'eladottAutok', 'tagAdmin'];
    if (adminPages.includes(pageName) && !currentUser) {
      console.log('🚫 Oldal nem elérhető, vissza autókra');
      pageName = 'autok';
    }
    
    // Tag Admin oldal csak adminoknak
    if (pageName === 'tagAdmin' && (!currentUser || currentUser.role !== 'admin')) {
      console.log('🚫 Tag Admin csak adminoknak');
      pageName = 'tagok';
    }
    
    // Összes oldal elrejtése
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
      page.classList.remove('active');
    });
    
    // Összes nav-btn aktív állapotának eltávolítása
    const allNavButtons = document.querySelectorAll('.main-nav .nav-btn');
    allNavButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Új oldal megjelenítése
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
      targetPage.classList.add('active');
      console.log('✅ Oldal megjelenítve:', pageName + 'Page');
      
      // Aktuális oldal mentése localStorage-ba
      saveCurrentPage(pageName);
      
      // Aktív gomb beállítása - MINDEN NAV-BAN
      const allActiveButtons = document.querySelectorAll(`.nav-btn[onclick="showPage('${pageName}')"]`);
      allActiveButtons.forEach(btn => {
        btn.classList.add('active');
      });
    }
    
    switch(pageName) {
      case 'autok':
        console.log('🚗 Autók betöltése...');
        loadCars();
        if (typeof loadNews === 'function') {
          loadNews();
        }
        break;
      case 'eladottAutok':
        console.log('✅ Eladott autók betöltése...');
        loadSoldCars();
        break;
      case 'autokKepek':
        console.log('🖼️ Autó képek betöltése...');
        loadCarGallery();
        break;
      case 'tuningok':
        console.log('🔧 Tuningok betöltése...');
        loadTunings();
        break;
      case 'tagok':
        console.log('👥 Tagok betöltése...');
        loadTags();
        break;
      case 'tagAdmin':
        console.log('👑 Tag Admin betöltése...');
        loadTagAdminData();
        break;
      case 'statisztika':
        console.log('📊 Statisztika betöltése...');
        loadStats();
        break;
    }
    
  } catch (error) {
    console.error('❌ showPage hiba:', error);
    showPage('autok');
  }
}

function saveCurrentPage(pageName) {
  try {
    localStorage.setItem('jimenezMotors_currentPage', pageName);
    console.log('💾 Oldal mentve:', pageName);
  } catch (error) {
    console.error('❌ Hiba az oldal mentésekor:', error);
  }
}

function loadCurrentPage() {
  try {
    const savedPage = localStorage.getItem('jimenezMotors_currentPage');
    console.log('📖 Mentett oldal betöltése:', savedPage);
    
    if (!savedPage) {
      console.log('ℹ️ Nincs mentett oldal, alapértelmezett: autok');
      return 'autok';
    }
    
    const isLoggedIn = !!currentUser;
    
    if ((savedPage === 'statisztika' || savedPage === 'autokKepek') && !isLoggedIn) {
      console.log('ℹ️ A mentett oldal csak bejelentkezés után érhető el, vissza autókra');
      return 'autok';
    }
    
    if (savedPage === 'login' && isLoggedIn) {
      console.log('ℹ️ Már bejelentkezve, vissza autókra');
      return 'autok';
    }
    
    console.log('✅ Mentett oldal betöltve:', savedPage);
    return savedPage;
    
  } catch (error) {
    console.error('❌ Hiba az oldal betöltésekor:', error);
    return 'autok';
  }
}

// === ADATBETÖLTÉS ===
const BOOTSTRAP_TIMEOUT_MS = 2000;
const LOCAL_BOOTSTRAP_CACHE_KEY = 'jimenezMotors_bootstrapCache';
const LOCAL_BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_BOOTSTRAP_CACHE_MAX_BYTES = 4 * 1024 * 1024; // ~4 MB biztonsági limit
const BOOTSTRAP_IMAGE_DB_NAME = 'JimenezBootstrapCache';
const BOOTSTRAP_IMAGE_DB_VERSION = 1;
const BOOTSTRAP_IMAGE_OBJECT_STORE = 'carImages';

let bootstrapCacheDisabled = false;
let bootstrapCacheDisableReason = '';
let bootstrapImageDbPromise = null;
let bootstrapImagePersistenceAvailable = typeof indexedDB !== 'undefined';
let bootstrapPersistenceTask = null;

function cancelPendingBootstrapPersistence() {
  if (!bootstrapPersistenceTask || typeof bootstrapPersistenceTask.cancel !== 'function') {
    bootstrapPersistenceTask = null;
    return;
  }

  try {
    bootstrapPersistenceTask.cancel();
  } catch (error) {
    console.warn('⚠️ Bootstrap gyorsítótár írás ütemezésének megszakítása sikertelen:', error);
  }

  bootstrapPersistenceTask = null;
}

function disableBootstrapCache(reason, error) {
  if (bootstrapCacheDisabled) {
    return;
  }

  cancelPendingBootstrapPersistence();

  bootstrapCacheDisabled = true;
  bootstrapCacheDisableReason = reason;

  try {
    localStorage.removeItem(LOCAL_BOOTSTRAP_CACHE_KEY);
  } catch (storageError) {
    console.warn('⚠️ Bootstrap cache disable cleanup error:', storageError);
  }

  if (typeof indexedDB !== 'undefined') {
    try {
      const deleteRequest = indexedDB.deleteDatabase(BOOTSTRAP_IMAGE_DB_NAME);
      deleteRequest.onerror = () => {
        console.warn('⚠️ Bootstrap kép gyorsítótár törlési hiba:', deleteRequest.error);
      };
      deleteRequest.onsuccess = () => {
        bootstrapImageDbPromise = null;
        bootstrapImagePersistenceAvailable = typeof indexedDB !== 'undefined';
      };
    } catch (dbError) {
      console.warn('⚠️ Bootstrap kép gyorsítótár törlési kivétel:', dbError);
      bootstrapImagePersistenceAvailable = typeof indexedDB !== 'undefined';
    }
  } else {
    bootstrapImagePersistenceAvailable = false;
  }

  if (error) {
    console.warn(`⚠️ Bootstrap cache letiltva (${reason}):`, error);
  } else {
    console.warn(`⚠️ Bootstrap cache letiltva (${reason})`);
  }
}

function estimateStringBytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }

  // Fallback becslés, UTF-16 karakterenként 2 byte-tal számolunk
  return str.length * 2;
}

function isQuotaExceededError(error) {
  if (!error) {
    return false;
  }

  if (error.code && error.code === 22) {
    return true;
  }

  if (error.name && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
    return true;
  }

  return false;
}
const MAX_BOOTSTRAP_REFETCH_ATTEMPTS = 3;
const BOOTSTRAP_REFETCH_BASE_DELAY_MS = 500;

let bootstrapRefetchAttempts = 0;
let bootstrapRefetchTimer = null;

async function loadCachedBootstrapData() {
  if (bootstrapCacheDisabled) {
    if (bootstrapCacheDisableReason) {
      console.debug('ℹ️ Bootstrap cache kihagyva:', bootstrapCacheDisableReason);
    }
    return null;
  }

  try {
    const raw = localStorage.getItem(LOCAL_BOOTSTRAP_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const { timestamp, data } = parsed;
    if (typeof timestamp !== 'number' || !data) {
      return null;
    }

    if (Date.now() - timestamp > LOCAL_BOOTSTRAP_CACHE_TTL_MS) {
      return null;
    }

    queueBootstrapImageRehydration(data);

    return data;
  } catch (error) {
    console.warn('⚠️ Bootstrap cache read error:', error);
    return null;
  }
}

function scheduleBootstrapPersistence(data) {
  if (bootstrapCacheDisabled || !data || typeof data !== 'object') {
    return;
  }

  cancelPendingBootstrapPersistence();

  const persist = () => {
    bootstrapPersistenceTask = null;
    try {
      saveCachedBootstrapData(data);
    } catch (error) {
      console.warn('⚠️ Bootstrap cache késleltetett mentési hiba:', error);
    }
  };

  const scheduleIdle = () => {
    if (typeof requestIdleCallback === 'function') {
      const idleHandle = requestIdleCallback(() => {
        bootstrapPersistenceTask = null;
        persist();
      }, { timeout: 1500 });

      bootstrapPersistenceTask = {
        cancel: () => {
          if (typeof cancelIdleCallback === 'function') {
            cancelIdleCallback(idleHandle);
          }
        }
      };

      return;
    }

    const timeoutHandle = setTimeout(() => {
      bootstrapPersistenceTask = null;
      persist();
    }, 0);

    bootstrapPersistenceTask = {
      cancel: () => clearTimeout(timeoutHandle)
    };
  };

  if (typeof requestAnimationFrame === 'function') {
    const frameHandle = requestAnimationFrame(() => {
      bootstrapPersistenceTask = null;
      scheduleIdle();
    });

    bootstrapPersistenceTask = {
      cancel: () => cancelAnimationFrame(frameHandle)
    };

    return;
  }

  scheduleIdle();
}

function createImageCacheKey(car, index) {
  if (car && (car.id || car.car_id)) {
    return `car-${car.id || car.car_id}`;
  }

  if (car && car.vin) {
    return `vin-${car.vin}`;
  }

  return `idx-${index}`;
}

function createCacheSafeBootstrapSnapshot(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const snapshot = {
    ...data,
  };

  const imageEntries = [];
  const referencedImageKeys = [];
  const canPersistImages = bootstrapImagePersistenceAvailable;

  if (Array.isArray(data.cars)) {
    snapshot.cars = data.cars.map((car, index) => {
      if (!car || typeof car !== 'object') {
        return car;
      }

      const sanitized = { ...car };

      if (canPersistImages && typeof sanitized.image_data_url === 'string' && sanitized.image_data_url.trim().length > 0) {
        const cacheKey = createImageCacheKey(sanitized, index);
        imageEntries.push({
          key: cacheKey,
          dataUrl: sanitized.image_data_url
        });
        sanitized.imageCacheKey = cacheKey;
        sanitized.hasImageDataUrl = true;
        delete sanitized.image_data_url;
      } else if (sanitized.imageCacheKey && sanitized.hasImageDataUrl) {
        sanitized.imageCacheKey = String(sanitized.imageCacheKey);
        sanitized.hasImageDataUrl = Boolean(sanitized.hasImageDataUrl);
      } else {
        sanitized.hasImageDataUrl = Boolean(
          (typeof sanitized.image_data_url === 'string' && sanitized.image_data_url.trim().length > 0) ||
          (typeof sanitized.imageUrl === 'string' && sanitized.imageUrl.trim().length > 0)
        );

        if (!sanitized.imageCacheKey && sanitized.hasImageDataUrl) {
          sanitized.imageCacheKey = createImageCacheKey(sanitized, index);
        }

        if (sanitized.image_data_url && sanitized.image_data_url.trim().length === 0) {
          delete sanitized.image_data_url;
        }
      }

      if (sanitized.hasImageDataUrl && sanitized.imageCacheKey && canPersistImages) {
        referencedImageKeys.push(sanitized.imageCacheKey);
      }

      return sanitized;
    });
  }

  return {
    snapshot,
    imageEntries,
    referencedImageKeys
  };
}

function saveCachedBootstrapData(data) {
  if (bootstrapCacheDisabled) {
    return;
  }

  try {
    const cacheSafeResult = createCacheSafeBootstrapSnapshot(data);

    if (!cacheSafeResult || !cacheSafeResult.snapshot) {
      return;
    }

    const { snapshot: cacheSafeData, imageEntries, referencedImageKeys } = cacheSafeResult;

    const payload = JSON.stringify({
      timestamp: Date.now(),
      data: cacheSafeData
    });

    const payloadSize = estimateStringBytes(payload);

    if (payloadSize > LOCAL_BOOTSTRAP_CACHE_MAX_BYTES) {
      disableBootstrapCache('túl nagy gyorsítótár (payload méret: ' + payloadSize + ' byte)');
      return;
    }

    localStorage.setItem(LOCAL_BOOTSTRAP_CACHE_KEY, payload);

    const entries = Array.isArray(imageEntries) ? imageEntries : [];
    const keys = Array.isArray(referencedImageKeys) ? referencedImageKeys : [];

    persistBootstrapImages(entries, keys)
      .then(() => {
        if (entries.length > 0 && !bootstrapImagePersistenceAvailable) {
          disableBootstrapCache('kép gyorsítótár nem elérhető');
        }
      })
      .catch(error => {
        console.warn('⚠️ Bootstrap kép gyorsítótár mentési hiba:', error);
      });
  } catch (error) {
    if (isQuotaExceededError(error)) {
      disableBootstrapCache('kvóta túllépés', error);
    } else {
      console.warn('⚠️ Bootstrap cache write error:', error);
    }
  }
}

function openBootstrapImageDb() {
  if (typeof indexedDB === 'undefined') {
    bootstrapImagePersistenceAvailable = false;
    return Promise.resolve(null);
  }

  if (bootstrapImageDbPromise) {
    return bootstrapImageDbPromise;
  }

  bootstrapImageDbPromise = new Promise(resolve => {
    try {
      const request = indexedDB.open(BOOTSTRAP_IMAGE_DB_NAME, BOOTSTRAP_IMAGE_DB_VERSION);

      request.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(BOOTSTRAP_IMAGE_OBJECT_STORE)) {
          db.createObjectStore(BOOTSTRAP_IMAGE_OBJECT_STORE);
        }
      };

      request.onsuccess = event => {
        const db = event.target.result;

        bootstrapImagePersistenceAvailable = true;
        db.onclose = () => {
          bootstrapImageDbPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        console.warn('⚠️ Nem sikerült megnyitni az IndexedDB alapú bootstrap kép gyorsítótárat:', request.error);
        bootstrapImageDbPromise = null;
        bootstrapImagePersistenceAvailable = false;
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('⚠️ IndexedDB bootstrap kép gyorsítótár blokkolva egy másik megnyitás által');
      };
    } catch (error) {
      console.warn('⚠️ IndexedDB megnyitási hiba:', error);
      bootstrapImageDbPromise = null;
      bootstrapImagePersistenceAvailable = false;
      resolve(null);
    }
  });

  return bootstrapImageDbPromise;
}

function cleanupBootstrapImages(db, keysToKeep) {
  if (!db) {
    return Promise.resolve();
  }

  const shouldKeep = new Set(keysToKeep || []);

  return new Promise(resolve => {
    const tx = db.transaction(BOOTSTRAP_IMAGE_OBJECT_STORE, 'readwrite');
    const store = tx.objectStore(BOOTSTRAP_IMAGE_OBJECT_STORE);

    if (typeof store.getAllKeys === 'function') {
      const request = store.getAllKeys();
      request.onsuccess = event => {
        const keys = event.target.result || [];
        keys.forEach(key => {
          if (!shouldKeep.has(key)) {
            store.delete(key);
          }
        });
      };
      request.onerror = () => {
        console.warn('⚠️ Bootstrap kép kulcsok beolvasási hiba:', request.error);
        bootstrapImagePersistenceAvailable = false;
      };
    } else {
      const cursorRequest = store.openKeyCursor();
      cursorRequest.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
          if (!shouldKeep.has(cursor.key)) {
            store.delete(cursor.key);
          }
          cursor.continue();
        }
      };
      cursorRequest.onerror = () => {
        console.warn('⚠️ Bootstrap kép kurzor hiba:', cursorRequest.error);
        bootstrapImagePersistenceAvailable = false;
      };
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      console.warn('⚠️ Bootstrap kép gyorsítótár tisztítási tranzakció hiba:', tx.error);
      bootstrapImagePersistenceAvailable = false;
      resolve();
    };
  });
}

async function persistBootstrapImages(entries, referencedKeys) {
  if (!Array.isArray(entries) && !Array.isArray(referencedKeys)) {
    return;
  }

  const db = await openBootstrapImageDb();
  if (!db) {
    if (Array.isArray(entries) && entries.length > 0) {
      bootstrapImagePersistenceAvailable = false;
    }
    return;
  }

  if (Array.isArray(entries) && entries.length > 0) {
    await new Promise(resolve => {
      const tx = db.transaction(BOOTSTRAP_IMAGE_OBJECT_STORE, 'readwrite');
      const store = tx.objectStore(BOOTSTRAP_IMAGE_OBJECT_STORE);
      const timestamp = Date.now();

      entries.forEach(entry => {
        if (!entry || !entry.key || typeof entry.dataUrl !== 'string') {
          return;
        }

        try {
          store.put({
            dataUrl: entry.dataUrl,
            updatedAt: timestamp
          }, entry.key);
        } catch (error) {
          console.warn('⚠️ Bootstrap kép beillesztési hiba:', error);
          bootstrapImagePersistenceAvailable = false;
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn('⚠️ Bootstrap kép írási tranzakció hiba:', tx.error);
        bootstrapImagePersistenceAvailable = false;
        resolve();
      };
    });
  }

  await cleanupBootstrapImages(db, referencedKeys || []);
}

async function rehydrateBootstrapImages(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.cars)) {
    return false;
  }

  const carsNeedingImages = data.cars
    .map((car, index) => {
      if (!car || typeof car !== 'object') {
        return null;
      }

      if (typeof car.image_data_url === 'string' && car.image_data_url.trim().length > 0) {
        return null;
      }

      if (!car.hasImageDataUrl) {
        return null;
      }

      const cacheKey = car.imageCacheKey || createImageCacheKey(car, index);

      if (!cacheKey) {
        return null;
      }

      return {
        car,
        cacheKey
      };
    })
    .filter(Boolean);

  if (carsNeedingImages.length === 0) {
    return false;
  }

  const db = await openBootstrapImageDb();
  if (!db) {
    return false;
  }

  let updated = false;

  await new Promise(resolve => {
    const tx = db.transaction(BOOTSTRAP_IMAGE_OBJECT_STORE, 'readonly');
    const store = tx.objectStore(BOOTSTRAP_IMAGE_OBJECT_STORE);

    carsNeedingImages.forEach(({ car, cacheKey }) => {
      try {
        const request = store.get(cacheKey);
        request.onsuccess = event => {
          const record = event.target.result;
          if (record && typeof record.dataUrl === 'string') {
            car.image_data_url = record.dataUrl;
            car.hasImageDataUrl = true;
            car.imageCacheKey = cacheKey;
            updated = true;
          }
        };
        request.onerror = () => {
          console.warn('⚠️ Bootstrap kép beolvasási hiba:', request.error);
        };
      } catch (error) {
        console.warn('⚠️ Bootstrap kép lekérési hiba:', error);
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      console.warn('⚠️ Bootstrap kép olvasási tranzakció hiba:', tx.error);
      resolve();
    };
  });

  return updated;
}

function refreshCarsFromBootstrap(cars) {
  if (!Array.isArray(cars)) {
    return;
  }

  try {
    if (typeof setCars === 'function') {
      setCars(cars);
      return;
    }

    const prepared = typeof transformCarRow === 'function'
      ? cars.map(transformCarRow).filter(Boolean)
      : cars.slice();

    allCars = prepared;
    carsLoaded = true;

    if (typeof renderCars === 'function') {
      renderCars(allCars);
    }
  } catch (error) {
    console.warn('⚠️ Bootstrap autó lista frissítés hiba:', error);
  }
}

function queueBootstrapImageRehydration(data) {
  if (!data || typeof data !== 'object') {
    return;
  }

  try {
    const promise = rehydrateBootstrapImages(data);
    if (!promise || typeof promise.then !== 'function') {
      return;
    }

    promise
      .then(updated => {
        if (updated) {
          refreshCarsFromBootstrap(data.cars);
        }
      })
      .catch(error => {
        console.warn('⚠️ Bootstrap kép rehidrálási hiba:', error);
      });
  } catch (error) {
    console.warn('⚠️ Bootstrap kép rehidrálás ütemezési hiba:', error);
  }
}

function clearCachedBootstrapData() {
  if (bootstrapCacheDisabled) {
    return;
  }

  cancelPendingBootstrapPersistence();

  try {
    localStorage.removeItem(LOCAL_BOOTSTRAP_CACHE_KEY);
  } catch (error) {
    console.warn('⚠️ Bootstrap cache clear error:', error);
  }

  persistBootstrapImages([], []).catch(error => {
    console.warn('⚠️ Bootstrap kép gyorsítótár törlési hiba:', error);
  });
}

function resetBootstrapRefetchState() {
  bootstrapRefetchAttempts = 0;
  if (bootstrapRefetchTimer) {
    clearTimeout(bootstrapRefetchTimer);
    bootstrapRefetchTimer = null;
  }
}

function scheduleBootstrapRefetch() {
  if (bootstrapRefetchAttempts >= MAX_BOOTSTRAP_REFETCH_ATTEMPTS) {
    return;
  }

  if (bootstrapRefetchTimer) {
    return;
  }

  const delay = Math.pow(2, bootstrapRefetchAttempts) * BOOTSTRAP_REFETCH_BASE_DELAY_MS;

  bootstrapRefetchTimer = setTimeout(async () => {
    bootstrapRefetchTimer = null;
    bootstrapRefetchAttempts += 1;

    try {
      const result = await fetchBootstrapData();

      if (processBootstrapResult(result)) {
        return;
      }

      if (bootstrapRefetchAttempts < MAX_BOOTSTRAP_REFETCH_ATTEMPTS) {
        scheduleBootstrapRefetch();
      }
    } catch (error) {
      console.warn('⚠️ Bootstrap refetch attempt failed:', error);
      if (bootstrapRefetchAttempts < MAX_BOOTSTRAP_REFETCH_ATTEMPTS) {
        scheduleBootstrapRefetch();
      }
    }
  }, delay);
}

function handleBootstrapRefetch(cacheStatus) {
  if (!cacheStatus) {
    resetBootstrapRefetchState();
    return;
  }

  const normalized = cacheStatus.toLowerCase();

  if (normalized === 'hit' || normalized === 'miss') {
    resetBootstrapRefetchState();
    return;
  }

  if (normalized === 'stale' || normalized === 'stale-error') {
    scheduleBootstrapRefetch();
    return;
  }

  resetBootstrapRefetchState();
}

function processBootstrapResult(result, { persist = true } = {}) {
  if (!result || !result.data) {
    return false;
  }

  const applied = applyBootstrapData(result.data);

  if (!applied) {
    return false;
  }

  if (persist) {
    scheduleBootstrapPersistence(result.data);
  }

  handleBootstrapRefetch(result.cacheStatus);
  return true;
}

async function fetchBootstrapData() {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
        }
      }, BOOTSTRAP_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(`${API_BASE_URL}/bootstrap.php`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });

    const payload = await response.json();

    if (!response.ok || payload.error || !payload.data) {
      const errorMessage = payload && payload.error ? payload.error.message : 'Ismeretlen hiba a bootstrap során';
      throw new Error(errorMessage);
    }

    const cacheHeader = response.headers ? response.headers.get('X-Bootstrap-Cache') : null;
    const cacheStatus = cacheHeader ? cacheHeader.toLowerCase() : null;

    return {
      data: payload.data,
      cacheStatus
    };
  } catch (error) {
    const abortErrorCode = typeof DOMException !== 'undefined' ? DOMException.ABORT_ERR : 20;
    const isAbortError = error && (error.name === 'AbortError' || error.code === abortErrorCode);

    if (isAbortError) {
      console.warn(`⏳ Bootstrap betöltés megszakítva ${BOOTSTRAP_TIMEOUT_MS} ms után, átváltás egyedi lekérésekre`);
    } else {
      console.warn('⚠️ Bootstrap betöltés sikertelen, visszatérés az egyedi lekérésekre', error);
    }

    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function applyBootstrapData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (Array.isArray(data.tuningOptions)) {
    tuningOptions = data.tuningOptions.slice();
    renderTuningOptions(tuningOptions);
  } else {
    tuningOptions = [];
    renderTuningOptions(tuningOptions);
  }

  if (Array.isArray(data.modelOptions)) {
    modelOptions = data.modelOptions.slice();
  } else {
    modelOptions = [];
  }

  if (Array.isArray(data.members)) {
    updateTagCaches(data.members);
  } else {
    updateTagCaches([]);
  }

  if (typeof setNews === 'function') {
    if (Array.isArray(data.news)) {
      setNews(data.news);
    } else {
      setNews([]);
    }
  }

  if (typeof setCars === 'function') {
    if (Array.isArray(data.cars)) {
      setCars(data.cars);
    } else {
      setCars([]);
    }
  } else {
    const fallbackCars = Array.isArray(data.cars) ? data.cars : [];
    allCars = typeof transformCarRow === 'function'
      ? fallbackCars.map(transformCarRow).filter(Boolean)
      : fallbackCars;
    carsLoaded = true;
    if (typeof renderCars === 'function') {
      renderCars(allCars);
    }
  }

  return true;
}

async function loadAllData() {
  try {
    console.log('🔄 Összes adat betöltése...');

    resetBootstrapRefetchState();

    const cachedBootstrap = await loadCachedBootstrapData();
    let appliedCachedData = false;

    if (cachedBootstrap) {
      appliedCachedData = applyBootstrapData(cachedBootstrap);
      if (appliedCachedData) {
        console.log('⚡️ Bootstrap adatok helyi gyorsítótárból betöltve');
      }
    }

    const bootstrapPromise = fetchBootstrapData();

    if (appliedCachedData) {
      bootstrapPromise
        .then(result => {
          if (!processBootstrapResult(result)) {
            console.warn('⚠️ Bootstrap frissítés nem alkalmazható, marad a gyorsítótár');
          }
        })
        .catch(error => {
          console.warn('⚠️ Bootstrap frissítés sikertelen:', error);
        });

      console.log('✅ Összes adat sikeresen betöltve (helyi gyorsítótár)');
      return;
    }

    const bootstrapResult = await bootstrapPromise;

    if (!processBootstrapResult(bootstrapResult)) {
      clearCachedBootstrapData();
      await Promise.all([
        loadTuningOptions(),
        loadModelOptions(),
        loadTagOptions(),
        loadCars(),
        loadNews()
      ]);
    }

    console.log('✅ Összes adat sikeresen betöltve');
  } catch (error) {
    console.error('❌ loadAllData hiba:', error);
    showMessage('Hiba történt az adatok betöltésekor', 'error');
  }
}

async function loadTuningOptions() {
  try {
    const { data, error } = await supabase
      .from('tuning_options')
      .select('name')
      .order('name');

    if (error) throw error;
    
    if (data && data.length > 0) {
      tuningOptions = data.map(item => item.name);
    } else {
      tuningOptions = [];
    }
    
    renderTuningOptions(tuningOptions);
  } catch (error) {
    console.error('Tuning options load error:', error);
    tuningOptions = [];
    renderTuningOptions(tuningOptions);
  }
}

function deriveTuningGroupName(rawName) {
  const safeName = (rawName || '').trim();
  if (!safeName) return 'Egyéb';

  const normalized = safeName.replace(/\s+/g, ' ');
  const prefixMatch = normalized.match(/^[^0-9]+/);
  let group = prefixMatch && prefixMatch[0] ? prefixMatch[0] : normalized.split(' ')[0];

  group = group.replace(/[-:_]+$/, '').trim();
  if (!group) {
    group = normalized;
  }

  return group.charAt(0).toUpperCase() + group.slice(1);
}

const EXCLUSIVE_TUNING_CATEGORIES = new Set(['chip', 'fek', 'fekek', 'valto', 'motor']);

function normalizeTuningCategory(name) {
  if (!name) return '';

  try {
    return name
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '');
  } catch (error) {
    console.error('normalizeTuningCategory hiba:', error);
    return name.toString().toLowerCase();
  }
}

function toggleTuningOption(button) {
  try {
    if (!button) return;

    const category = button.dataset.category || button.dataset.group || '';
    const normalizedCategory = normalizeTuningCategory(category);
    const isExclusive = EXCLUSIVE_TUNING_CATEGORIES.has(normalizedCategory);

    if (isExclusive) {
      const matchingOptions = Array.from(document.querySelectorAll('.modern-tuning-option'))
        .filter(opt => normalizeTuningCategory(opt.dataset.category || opt.dataset.group || '') === normalizedCategory);

      matchingOptions.forEach(opt => {
        if (opt !== button) {
          opt.classList.remove('selected', 'option-hidden');
          opt.style.transform = 'translateY(0) scale(1)';
        }
      });
    }

    const isSelected = button.classList.contains('selected');

    if (isSelected) {
      button.classList.remove('selected');
      button.style.transform = 'translateY(0) scale(1)';
    } else {
      button.classList.add('selected');
      button.style.transform = 'translateY(-2px) scale(1.05)';
    }
  } catch (error) {
    console.error('toggleTuningOption hiba:', error);
  }
}

function resetTuningOptionVisibility() {
  try {
    document.querySelectorAll('.modern-tuning-option').forEach(opt => {
      opt.classList.remove('selected', 'option-hidden');
      opt.style.transform = 'translateY(0) scale(1)';
    });
  } catch (error) {
    console.error('resetTuningOptionVisibility hiba:', error);
  }
}

function renderTuningOptions(options) {
  try {
    const container = document.getElementById('addCarTuningContainer');
    const compactSection = document.getElementById('addCarCompactSection');
    if (!container) return;

    container.innerHTML = '';
    if (!options || options.length === 0) {
      container.innerHTML = '<div class="tuning-loading">Nincs tuning opció.</div>';
      if (compactSection) {
        compactSection.style.display = 'none';
      }
      return;
    }

    const uniqueOptions = Array.from(
      new Set(
        options
          .map(opt => (opt || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'hu', { numeric: true, sensitivity: 'base' }));

    if (compactSection) {
      compactSection.style.display = 'none';
    }

    if (uniqueOptions.length === 0) {
      container.innerHTML = '<div class="tuning-loading">Nincs tuning opció.</div>';
      return;
    }

    const groupName = 'Összes opció';
    const groupEl = document.createElement('div');
    groupEl.className = 'tuning-tab-group';

    const titleEl = document.createElement('div');
    titleEl.className = 'tuning-tab-label';
    titleEl.textContent = groupName;
    groupEl.appendChild(titleEl);

    const optionsEl = document.createElement('div');
    optionsEl.className = 'tuning-tab-options';

    uniqueOptions.forEach(value => {
      const category = deriveTuningGroupName(value);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'modern-tuning-option';
      button.textContent = value;
      button.dataset.group = groupName;
      button.dataset.category = category;
      button.dataset.value = value;
      button.onclick = () => toggleTuningOption(button);
      optionsEl.appendChild(button);
    });

    groupEl.appendChild(optionsEl);
    container.appendChild(groupEl);
  } catch (error) {
    console.error('renderTuningOptions hiba:', error);
    const compactSection = document.getElementById('addCarCompactSection');
    if (compactSection) {
      compactSection.style.display = 'none';
    }
  }
}

async function loadModelOptions() {
  try {
    const { data, error } = await supabase
      .from('car_models')
      .select('name')
      .order('name');

    if (error) throw error;
    
    if (data && data.length > 0) {
      modelOptions = data.map(item => item.name);
    } else {
      modelOptions = [
      ];
    }
  } catch (error) {
    console.error('Model options load error:', error);
    modelOptions = [
    ];
  }
}

async function loadTagOptions() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('id, name, phone, rank, created_at')
      .order('name');

    if (error) throw error;
    updateTagCaches(data || []);
  } catch (error) {
    console.error('Tag options load error:', error);
    updateTagCaches([]);
  }
}

// === OLDAL BETÖLTÉSE ===
window.onload = async () => {
  try {
    console.log('🔄 Oldal betöltése...');
    
    showLoadingState();
    
    const savedUser = loadLoginState();
    if (savedUser) {
      console.log('✅ Automatikus bejelentkezés:', savedUser.tagName);
      currentUser = savedUser;
    }
    
    updateUIForLoginState();
    
    console.log('📦 Adatok betöltése...');
    await loadAllData();
    console.log('✅ Adatok betöltve');
    
    const targetPage = loadCurrentPage();
    console.log('🎯 Céloldal:', targetPage);
    showPage(targetPage);
    
    hideLoadingState();
    
  } catch (error) {
    console.error('❌ Window load hiba:', error);
    showPage('autok');
    hideLoadingState();
  }
};

// === FRISSÍTÉS FUNKCIÓ ===
async function refreshAllData() {
  try {
    console.log('🔄 Összes adat frissítése...');
    
    const refreshBtn = document.querySelector('.modern-btn-refresh');
    const originalText = refreshBtn ? refreshBtn.innerHTML : '🔄 Frissítés';
    if (refreshBtn) {
      refreshBtn.innerHTML = '⏳ Frissítés...';
      refreshBtn.disabled = true;
    }
    
    await loadAllData();
    
    if (document.getElementById('statisztikaPage').classList.contains('active')) {
      loadStats();
    }
    
    if (refreshBtn) {
      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
    
    showMessage('✅ Összes adat frissítve!', 'success');
    console.log('✅ Frissítés kész');
    
  } catch (error) {
    console.error('❌ Frissítés hiba:', error);
    showMessage('❌ Hiba történt a frissítés során', 'error');
    
    const refreshBtn = document.querySelector('.modern-btn-refresh');
    if (refreshBtn) {
      refreshBtn.innerHTML = '🔄 Összes adat frissítése';
      refreshBtn.disabled = false;
    }
  }
}

// Event listener-ek
document.addEventListener('click', function(event) {
  try {
    const modelDropdown = document.getElementById('modelDropdown');
    const modelSearch = document.getElementById('modelSearch');
    const galleryModelDropdown = document.getElementById('galleryModelDropdown');
    const galleryModelSearch = document.getElementById('galleryModelSearch');
    
    if (modelSearch && modelDropdown && !modelSearch.contains(event.target) && !modelDropdown.contains(event.target)) {
      modelDropdown.style.display = 'none';
    }
    
    if (galleryModelSearch && galleryModelDropdown && !galleryModelSearch.contains(event.target) && !galleryModelDropdown.contains(event.target)) {
      galleryModelDropdown.style.display = 'none';
    }
  } catch (error) {
    console.error('Dropdown click handler hiba:', error);
  }
});

window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  showMessage('Váratlan hiba történt', 'error');
});

// ... meglévő kód ...

// Galéria autók betöltése az allCars változóba is
async function loadCarGallery() {
  try {
    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Galéria autók is kerüljenek az allCars-ba a megjelenítéshez
    const galleryCars = cars || [];
    
    // Frissítjük az allCars-t a galéria autókkal is
    galleryCars.forEach(galleryCar => {
      const existingIndex = allCars.findIndex(car => car.id === galleryCar.id);
      if (existingIndex === -1) {
        allCars.push({
          ...galleryCar,
          VetelArFormatted: '',
          KivantArFormatted: '',
          EladasiArFormatted: galleryCar.sale_price ? new Intl.NumberFormat('hu-HU').format(galleryCar.sale_price) : '',
          Model: galleryCar.model,
          Tuning: '',
          VetelAr: null,
          KivantAr: null,
          EladasiAr: galleryCar.sale_price,
          Eladva: false,
          Hozzáadta: galleryCar.added_by,
          KepURL: getImageUrl(galleryCar.image_url),
          is_gallery: true
        });
      }
    });
    
    renderCarGallery(galleryCars);
  } catch (error) {
    console.error('Car gallery load error:', error);
    const tbody = document.getElementById('galleryTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #e53e3e; padding: 20px;">
          ❌ Hiba történt az autó képek betöltésekor
        </td>
      </tr>
    `;
  }
}