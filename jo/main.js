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
async function fetchBootstrapData() {
  try {
    const response = await fetch(`${API_BASE_URL}/bootstrap.php`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    const payload = await response.json();

    if (!response.ok || payload.error || !payload.data) {
      const errorMessage = payload && payload.error ? payload.error.message : 'Ismeretlen hiba a bootstrap során';
      throw new Error(errorMessage);
    }

    return payload.data;
  } catch (error) {
    console.warn('⚠️ Bootstrap betöltés sikertelen, visszatérés az egyedi lekérésekre', error);
    return null;
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

    const bootstrapData = await fetchBootstrapData();

    if (bootstrapData) {
      applyBootstrapData(bootstrapData);
    } else {
      await Promise.all([
        loadTuningOptions(),
        loadModelOptions(),
        loadTagOptions(),
        loadCars()
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

function renderTuningOptions(options) {
  try {
    const container = document.getElementById('tuningContainer');
    if (!container) return;
    
    container.innerHTML = '';
    if (!options || options.length === 0) {
      container.textContent = 'Nincs tuning opció.';
      return;
    }
    
    options.forEach(optText => {
      const div = document.createElement('div');
      div.className = 'modern-tuning-option';
      div.textContent = escapeHtml(optText);
      div.onclick = () => {
        div.classList.toggle('selected');
        if (div.classList.contains('selected')) {
          div.style.transform = 'translateY(-2px) scale(1.05)';
        } else {
          div.style.transform = 'translateY(0) scale(1)';
        }
      };
      container.appendChild(div);
    });
  } catch (error) {
    console.error('renderTuningOptions hiba:', error);
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