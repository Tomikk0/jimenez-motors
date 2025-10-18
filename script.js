// === DEBUG INFORMÁCIÓ ===
console.log('🔄 Script betöltődött');

// === SUPABASE KAPCSOLAT === 
const supabaseUrl = 'https://abpmluenermqghrrtjhq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicG1sdWVuZXJtcWdocnJ0amhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTYzMjgsImV4cCI6MjA3NjI5MjMyOH0.YkTZME_BB86r3mM8AyNYu-2yaMdh4LtDhHbynvdkaKA';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let tuningOptions = [];
let modelOptions = [];
let tagOptions = [];
let allCars = [];
let currentUser = null;
let searchTimeout;
let selectedImage = null;
let currentCarIdForSale = null;

// === BEJELENTKEZÉSI ÁLLAPOT MENTÉSE ===
function saveLoginState(user) {
    try {
        const userData = {
            username: user.username,
            tagName: user.tagName,
            role: user.role,
            rank: user.rank,
            loginTime: new Date().getTime()
        };
        localStorage.setItem('jimenezMotors_user', JSON.stringify(userData));
        console.log('💾 Bejelentkezés mentve:', userData.tagName);
        return true;
    } catch (error) {
        console.error('❌ Hiba mentéskor:', error);
        return false;
    }
}

function loadLoginState() {
    try {
        const saved = localStorage.getItem('jimenezMotors_user');
        console.log('📖 Mentett bejelentkezés betöltése...');
        
        if (saved) {
            const userData = JSON.parse(saved);
            console.log('📋 UserData betöltve:', userData);
            
            // Egyszerű ellenőrzés - ha van tagName, akkor jó
            if (userData && userData.tagName) {
                console.log('✅ Érvényes bejelentkezés betöltve:', userData.tagName);
                return userData;
            }
        }
        console.log('❌ Nincs érvényes mentett bejelentkezés');
        return null;
    } catch (error) {
        console.error('❌ Hiba betöltéskor:', error);
        return null;
    }
}

function clearLoginState() {
    localStorage.removeItem('jimenezMotors_user');
    console.log('🗑️ Bejelentkezési adatok törölve');
}

// === UI FRISSÍTÉS ===
function updateUIForLoginState() {
    console.log('🎨 UI frissítése, currentUser:', currentUser);
    
    const isLoggedIn = !!currentUser;
    
    // Admin funkciók
    const adminFunctions = document.getElementById('adminFunctions');
    if (adminFunctions) adminFunctions.style.display = isLoggedIn ? 'block' : 'none';
    
    
    // Táblázat fejlécek
    const kivantHeader = document.getElementById('kivantHeader');
    const actionHeader = document.getElementById('actionHeader');
    const tagActionHeader = document.getElementById('tagActionHeader');
    const vetelHeader = document.getElementById('vetelHeader');
    
    if (kivantHeader) kivantHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (actionHeader) actionHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (tagActionHeader) tagActionHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (vetelHeader) vetelHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    
    // FRISSÍTÉS GOMB - CSAK BEJELENTKEZÉS NÉLKÜL
    const refreshButtonContainer = document.getElementById('refreshButtonContainer');
    if (refreshButtonContainer) {
        refreshButtonContainer.style.display = isLoggedIn ? 'none' : 'block';
    }
    
    // Login gombok
    document.querySelectorAll('.login-btn').forEach(btn => {
        if (isLoggedIn) {
            btn.innerHTML = '🚪 Kijelentkezés (' + currentUser.tagName + ')';
            btn.onclick = logout;
        } else {
            btn.innerHTML = '🔐 Bejelentkezés';
            btn.onclick = () => showPage('login');
        }
    });
    
    // Body class
    if (isLoggedIn) {
        document.body.classList.add('logged-in');
    } else {
        document.body.classList.remove('logged-in');
    }
    
    // Statisztika gomb
    updateStatisztikaButton();
    
    console.log('✅ UI frissítve, logged-in:', isLoggedIn);
}

function updateStatisztikaButton() {
    const statBtn = document.querySelector('.nav-btn[onclick="showPage(\'statisztika\')"]');
    if (statBtn) {
        statBtn.style.display = currentUser ? 'inline-block' : 'none';
    }
}

// === BEJELENTKEZÉS/KIJELENTKEZÉS ===
async function login() {
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        console.log('🔐 Login próbálkozás:', username);
        
        if (!username || !password) {
            showLoginMessage('Írd be a felhasználónevet és jelszót!', 'warning');
            return;
        }

        const { data: users, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', username);

        if (error || !users || users.length === 0) {
            console.log('❌ Login hiba: felhasználó nem található');
            showLoginMessage('Hibás felhasználónév vagy jelszó!', 'error');
            return;
        }

        const user = users[0];
        
        if (user.password_hash === btoa(password)) {
            currentUser = { 
                username: user.username, 
                role: user.role,
                tagName: user.member_name,
                rank: user.rank 
            };
            
            console.log('✅ Sikeres login:', currentUser);
            
            // Mentés és UI frissítés
            saveLoginState(currentUser);
            updateUIForLoginState();
            
            // Adatok betöltése
            loadCars();
            loadTags();
            
            showPage('autok');
            showMessage('Sikeres bejelentkezés!', 'success');
        } else {
            console.log('❌ Hibás jelszó');
            showLoginMessage('Hibás jelszó!', 'error');
        }
    } catch (error) {
        console.error('❌ Login hiba:', error);
        showLoginMessage('Hiba történt a bejelentkezés során', 'error');
    }
}

function logout() {
    try {
        console.log('🚪 Kijelentkezés');
        currentUser = null;
        
        // Törlés és UI frissítés
        clearLoginState();
        updateUIForLoginState();
        
        // Adatok betöltése
        loadCars();
        loadTags();
        
        showPage('autok');
        showMessage('Sikeres kijelentkezés!', 'success');
    } catch (error) {
        console.error('❌ Logout hiba:', error);
    }
}

// ===== OLDAL KEZELÉS =====
function showPage(pageName) {
  try {
    console.log('🔄 Oldalváltás:', pageName);
    
    // Összes oldal elrejtése
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
      page.classList.remove('active');
    });
    
    // Összes gomb inaktívvá tétele
    const allButtons = document.querySelectorAll('.nav-btn');
    allButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Új oldal megjelenítése
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
      targetPage.classList.add('active');
      console.log('✅ Oldal megjelenítve:', pageName + 'Page');
      
      // Login oldal speciális kezelése
      if (pageName === 'login') {
        setTimeout(() => {
          setupEnterKeyListener();
          const usernameInput = document.getElementById('username');
          if (usernameInput) usernameInput.focus();
        }, 100);
      }
    }
    
    // Aktív gomb beállítása
    const activeButton = document.querySelector(`.nav-btn[onclick="showPage('${pageName}')"]`);
    if (activeButton) {
      activeButton.classList.add('active');
    }
    
    // Adatok betöltése
    switch(pageName) {
      case 'autok':
        console.log('🚗 Autók betöltése...');
        loadCars();
        break;
      case 'tagok':
        console.log('👥 Tagok betöltése...');
        loadTags();
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

// ===== KÉPKEZELÉS =====
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showMessage('A kép mérete túl nagy! Maximum 5MB lehet.', 'error');
    return;
  }

  if (!file.type.match('image.*')) {
    showMessage('Csak képeket tölthetsz fel!', 'error');
    return;
  }

  document.getElementById('imageFileName').textContent = file.name;

  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${e.target.result}" alt="Előnézet">`;
    
    selectedImage = {
      dataUrl: e.target.result,
      name: file.name
    };
    
    console.log('📷 Kép betöltve, méret:', Math.round(e.target.result.length / 1024) + 'KB');
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  document.getElementById('carImage').value = '';
  document.getElementById('imageFileName').textContent = 'Nincs kép kiválasztva';
  document.getElementById('imagePreview').innerHTML = '';
  selectedImage = null;
}

function showImageModal(imageUrl) {
  console.log('🖼 Modal megnyitása képhez:', imageUrl);
  
  // Ellenőrizzük, hogy van-e kép URL
  if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
    console.log('❌ Nincs érvényes kép URL');
    showMessage('Nincs elérhető kép a megjelenítéshez', 'warning');
    return;
  }

  // Modal elem létrehozása
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.style.display = 'block';
  
  // Kép elem létrehozása
  const img = document.createElement('img');
  img.className = 'modal-content';
  img.src = imageUrl;
  img.alt = 'Autó kép';
  
  // Hibakezelés
  img.onload = function() {
    console.log('✅ Kép sikeresen betöltve');
  };
  
  img.onerror = function() {
    console.log('❌ Kép betöltési hiba');
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktJUCBORSBNVUtPRElLPC90ZXh0Pgo8L3N2Zz4=';
  };

  // Bezáró gomb
  const closeSpan = document.createElement('span');
  closeSpan.className = 'close-modal';
  closeSpan.innerHTML = '&times;';
  closeSpan.onclick = function() {
    modal.style.display = 'none';
    document.body.removeChild(modal);
  };

  // Modal összeállítása
  modal.appendChild(closeSpan);
  modal.appendChild(img);

  // Modal hozzáadása a body-hoz
  document.body.appendChild(modal);

  // Kattintás a modal-on kívülre is bezárja
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.removeChild(modal);
    }
  };

  // ESC billentyű is bezárja
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      modal.style.display = 'none';
      document.body.removeChild(modal);
      document.removeEventListener('keydown', escHandler);
    }
  });
}

function getImageUrl(imagePath) {
  console.log('🔗 Kép URL generálás:', imagePath);
  
  if (!imagePath) {
    console.log('❌ Nincs kép path');
    return '';
  }
  
  if (imagePath.startsWith('http')) {
    console.log('✅ HTTP URL');
    return imagePath;
  }
  
  if (imagePath.startsWith('data:image')) {
    console.log('✅ Base64 kép');
    return imagePath;
  }
  
  if (imagePath.includes('undefined')) {
    console.log('❌ Undefined kép');
    return '';
  }
  
  const finalUrl = `${supabaseUrl}/storage/v1/object/public/car-images/${imagePath}`;
  console.log('✅ Supabase URL:', finalUrl);
  return finalUrl;
}

// ===== SEGÉDFÜGGVÉNYEK =====
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text, type = 'success') {
  const messageEl = document.getElementById('message');
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

function showLoginMessage(text, type = 'success') {
  const messageEl = document.getElementById('loginMessage');
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

function showTagMessage(text, type = 'success') {
  const messageEl = document.getElementById('tagMessage');
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

// ===== ADATBETÖLTÉS =====
async function loadAllData() {
  try {
    await loadTuningOptions();
    await loadModelOptions();
    await loadTagOptions();
    await loadCars();
  } catch (error) {
    console.error('loadAllData hiba:', error);
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
      tuningOptions = [
        'Motor 1', 'Motor 2', 'Motor 3',
        'Chip 1', 'Chip 2', 'Chip 3',
        'Váltó 1', 'Váltó 2', 'Váltó 3',
        'Kerék 1', 'Kerék 2', 'Kerék 3',
        'Metál', 'Matt', 'Króm',
        'Neon', 'Lámpa', 'BF',
        'Turbó', 'Drivetype', 'Kompresszor', 'Nitro'
      ];
    }
    
    renderTuningOptions(tuningOptions);
  } catch (error) {
    console.error('Tuning options load error:', error);
    tuningOptions = [
      'Motor 1', 'Motor 2', 'Motor 3',
      'Chip 1', 'Chip 2', 'Chip 3',
      'Váltó 1', 'Váltó 2', 'Váltó 3',
      'Kerék 1', 'Kerék 2', 'Kerék 3',
      'Metál', 'Matt', 'Króm',
      'Neon', 'Lámpa', 'BF',
      'Turbó', 'Drivetype', 'Kompresszor', 'Nitro'
    ];
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
        'BMW M3', 'BMW M4', 'BMW M5', 'Mercedes C63 AMG', 'Mercedes E63 AMG',
        'Audi RS6', 'Audi RS7', 'Audi RS5', 'Porsche 911', 'Lamborghini Huracan'
      ];
    }
  } catch (error) {
    console.error('Model options load error:', error);
    modelOptions = [
      'BMW M3', 'BMW M4', 'BMW M5', 'Mercedes C63 AMG', 'Mercedes E63 AMG',
      'Audi RS6', 'Audi RS7', 'Audi RS5', 'Porsche 911', 'Lamborghini Huracan'
    ];
  }
}

async function loadTagOptions() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('name');
    
    if (error) throw error;
    tagOptions = data || [];
  } catch (error) {
    console.error('Tag options load error:', error);
    tagOptions = [];
  }
}

async function loadCars() {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allCars = data || [];
    
    allCars = allCars.map(car => ({
      ...car,
      VetelArFormatted: car.purchase_price ? new Intl.NumberFormat('hu-HU').format(car.purchase_price) : '',
      KivantArFormatted: car.desired_price ? new Intl.NumberFormat('hu-HU').format(car.desired_price) : '',
      EladasiArFormatted: car.sale_price ? new Intl.NumberFormat('hu-HU').format(car.sale_price) : '',
      Model: car.model,
      Tuning: car.tuning,
      VetelAr: car.purchase_price,
      KivantAr: car.desired_price,
      EladasiAr: car.sale_price,
      Eladva: car.sold,
      Hozzáadta: car.added_by,
      KepURL: getImageUrl(car.image_url),
      sold_by: car.sold_by,
      sold_at: car.sold_at
    }));
    
    renderCars(allCars);
  } catch (error) {
    console.error('Cars load error:', error);
    showMessage('Hiba történt az autók betöltésekor', 'error');
  }
}

async function loadTags() {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*');

    if (error) throw error;
    
    const rankHierarchy = {
      'Owner': 1,
      'Co-Owner': 2,
      'Manager': 3,
      'Team Leader': 4,
      'Top Salesman': 5,
      'Sr. Salesman': 6,
      'Jr. Salesman': 7,
      'Towing Specialist': 8,
      'Tow Operator': 9,
      'Truck Driver': 10,
      'Member': 11
    };

    const sortedTags = (data || []).sort((a, b) => {
      const rankOrderA = rankHierarchy[a.rank] || 99;
      const rankOrderB = rankHierarchy[b.rank] || 99;
      
      if (rankOrderA !== rankOrderB) {
        return rankOrderA - rankOrderB;
      }
      
      return a.name.localeCompare(b.name);
    }).map(tag => ({
      name: tag.name,
      rank: tag.rank
    }));
    
    renderTags(sortedTags);
  } catch (error) {
    console.error('Tags load error:', error);
    showTagMessage('Hiba történt a tagok betöltésekor', 'error');
  }
}

function loadStats() {
  try {
    const totalCars = allCars.length;
    const soldCars = allCars.filter(car => car.Eladva).length;
    
    document.getElementById('totalCars').textContent = totalCars;
    document.getElementById('soldCars').textContent = soldCars;
    document.getElementById('totalTags').textContent = tagOptions.length;
    
    let totalProfit = 0;
    allCars.forEach(car => {
      if (car.Eladva) {
        const vetel = parseFloat(car.VetelAr) || 0;
        const eladas = parseFloat(car.EladasiAr) || 0;
        if (vetel > 0 && eladas > 0) {
          totalProfit += (eladas - vetel);
        }
      }
    });
    
    const formattedProfit = new Intl.NumberFormat('hu-HU').format(totalProfit);
    document.getElementById('totalProfit').textContent = formattedProfit + ' $';
    
    const modelCount = {};
    allCars.forEach(car => {
      if (car.Model) {
        modelCount[car.Model] = (modelCount[car.Model] || 0) + 1;
      }
    });
    
    let popularModel = '-';
    let maxCount = 0;
    for (const model in modelCount) {
      if (modelCount[model] > maxCount) {
        maxCount = modelCount[model];
        popularModel = model;
      }
    }
    document.getElementById('popularModel').textContent = popularModel;
  } catch (error) {
    console.error('loadStats hiba:', error);
  }
}

// ===== MEGJELENÍTÉS =====
function renderCars(cars) {
    try {
        const tbody = document.getElementById('carTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!cars || cars.length === 0) {
            const colCount = currentUser ? 9 : 7;
            tbody.innerHTML = `
                <tr>
                    <td colspan="${colCount}" class="empty-table-message">
                        Nincs megjeleníthető autó<br>
                        <small style="opacity: 0.7;">Adj hozzá egy új autót a fenti űrlappal!</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        cars.forEach(c => {
            const row = document.createElement('tr');
            if (c.Eladva) {
                row.classList.add('sold-row');
            }
            
            // KÉP RÉSZ
            let imageHtml = '';
            let imageUrl = '';

            if (c.image_url && c.image_url.trim() !== '') {
                imageUrl = getImageUrl(c.image_url);
            } else if (c.image_data_url && c.image_data_url.trim() !== '') {
                imageUrl = c.image_data_url;
            }

            if (imageUrl && !imageUrl.includes('undefined') && imageUrl !== '') {
                imageHtml = `
                    <td class="image-cell">
                        <img src="${imageUrl}" 
                             class="modern-car-image" 
                             onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')"
                             alt="${escapeHtml(c.Model || '')}">
                    </td>
                `;
            } else {
                imageHtml = `
                    <td class="image-cell">
                        <div class="no-image-placeholder">
                            👁️<br>Nincs
                        </div>
                    </td>
                `;
            }
            
            // ÁRAK - Vételár a tuning és kívánt ár között
            const vetelAr = c.VetelArFormatted || '';
            const kivantAr = c.KivantArFormatted || '';
            const eladasiAr = c.EladasiArFormatted || '';
            
            let vetelArCell = '';
            let kivantArCell = '';
            
            if (currentUser) {
                // BEJELENTKEZVE: vételár a tuning után, kívánt ár előtt
                vetelArCell = `<td class="price-cell price-purchase">${vetelAr ? vetelAr + ' $' : '-'}</td>`;
                kivantArCell = `<td class="price-cell price-desired">${kivantAr ? kivantAr + ' $' : '-'}</td>`;
            } else {
                // NEM BEJELENTKEZVE: vételár és kívánt ár elrejtve
                vetelArCell = '';
                kivantArCell = '';
            }
            
            // STÁTUSZ
            let statusCell = '';
            if (c.Eladva) {
                statusCell = `
                    <td>
                        <span class="status-badge status-sold">✅ ELADVA</span>
                        ${c.sold_by ? `<br><small style="color: #718096; font-size: 0.8em;">Eladta: ${escapeHtml(c.sold_by)}</small>` : ''}
                        ${c.sold_at ? `<br><small style="color: #718096; font-size: 0.8em;">${new Date(c.sold_at).toLocaleDateString('hu-HU')}</small>` : ''}
                    </td>
                `;
            } else {
                statusCell = `
                    <td>
                        <span class="status-badge status-available">💰 ELADÓ</span>
                    </td>
                `;
            }
            
            // MŰVELET GOMBOK
            let actionCell = '';
            if (currentUser) {
                const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
                
                let buttonsHtml = '';
                
                if (!c.Eladva) {
                    buttonsHtml += `<button class="modern-btn-sold" onclick="openSoldModal(${c.id})">Eladva</button>`;
                }
                
                if (canDelete) {
                    buttonsHtml += `<button class="modern-btn-delete" onclick="deleteCar(${c.id})">❌ Törlés</button>`;
                }
                
                actionCell = `
                    <td class="action-cell">
                        <div class="modern-action-buttons">
                            ${buttonsHtml}
                        </div>
                    </td>
                `;
            } else {
                actionCell = '';
            }
            
            // Hozzáadta oszlop - NÉV + TELEFONSZÁM
            let hozzaadtaCell = '';
            if (c.Hozzáadta) {
                // Telefonszám keresése a tagOptions-ból
                const eladoTag = tagOptions.find(tag => tag.name === c.Hozzáadta);
                const telefonszam = eladoTag?.phone || '';
                
                if (telefonszam) {
                    hozzaadtaCell = `
                        <td style="color: #4a5568;">
                            <div style="font-weight: 600;">${escapeHtml(c.Hozzáadta)}</div>
                            <div style="color: #4299e1; font-size: 0.85em; font-family: monospace; margin-top: 4px;">
                                📞 ${escapeHtml(telefonszam)}
                            </div>
                        </td>
                    `;
                } else {
                    hozzaadtaCell = `
                        <td style="color: #4a5568;">
                            <div style="font-weight: 600;">${escapeHtml(c.Hozzáadta)}</div>
                            <div style="color: #a0aec0; font-size: 0.8em; font-style: italic; margin-top: 4px;">
                                nincs telefonszám
                            </div>
                        </td>
                    `;
                }
            } else {
                hozzaadtaCell = `<td style="color: #4a5568;">-</td>`;
            }
            
            // SOR ÖSSZEÁLLÍTÁSA - VÉTELÁR A TUNING ÉS KÍVÁNT ÁR KÖZÖTT
            if (currentUser) {
                // BEJELENTKEZVE: minden oszlop megjelenik
                row.innerHTML = `
                    ${imageHtml}
                    <td style="font-weight: 600; color: #2d3748;">${escapeHtml(c.Model || '')}</td>
                    <td style="color: #718096; font-size: 0.9em;">${escapeHtml(c.Tuning || '-')}</td>
                    ${vetelArCell}
                    ${kivantArCell}
                    <td class="price-cell price-sale">${eladasiAr ? eladasiAr + ' $' : '-'}</td>
                    ${hozzaadtaCell}
                    ${statusCell}
                    ${actionCell}
                `;
            } else {
                // NEM BEJELENTKEZVE: csak a látható oszlopok
                row.innerHTML = `
                    ${imageHtml}
                    <td style="font-weight: 600; color: #2d3748;">${escapeHtml(c.Model || '')}</td>
                    <td style="color: #718096; font-size: 0.9em;">${escapeHtml(c.Tuning || '-')}</td>
                    <td class="price-cell price-sale">${eladasiAr ? eladasiAr + ' $' : '-'}</td>
                    ${hozzaadtaCell}
                    ${statusCell}
                `;
            }
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('renderCars hiba:', error);
        const tbody = document.getElementById('carTableBody');
        const colCount = currentUser ? 9 : 7;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" style="text-align: center; color: #e53e3e; padding: 20px;">
                    ❌ Hiba történt az autók betöltése során
                </td>
            </tr>
        `;
    }
}

function renderTags(tags) {
  try {
    const tbody = document.getElementById('tagsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!tags || tags.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="empty-table-message">Nincs megjeleníthető tag</td></tr>';
      return;
    }
    
    tags.forEach(tag => {
      const row = document.createElement('tr');
      
      const rankIcon = getRankIcon(tag.rank);
      const rankDisplay = tag.rank ? `${rankIcon} ${escapeHtml(tag.rank)}` : 'Nincs rang';
      
      let actionCell = '';
      if (currentUser && currentUser.role === 'admin') {
        // CSAK ADMIN LÁTHATJA A MŰVELET GOMBOKAT
        actionCell = `
          <td>
            <div class="modern-action-buttons">
              <select onchange="updateTagRank('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)" class="modern-input" style="padding: 8px; font-size: 0.85em; min-width: 140px;">
                <option value="">Válassz rangot</option>
                <option value="Owner" ${tag.rank === 'Owner' ? 'selected' : ''}>Owner</option>
                <option value="Co-Owner" ${tag.rank === 'Co-Owner' ? 'selected' : ''}>Co-Owner</option>
                <option value="Manager" ${tag.rank === 'Manager' ? 'selected' : ''}>Manager</option>
                <option value="Team Leader" ${tag.rank === 'Team Leader' ? 'selected' : ''}>Team Leader</option>
                <option value="Top Salesman" ${tag.rank === 'Top Salesman' ? 'selected' : ''}>Top Salesman</option>
                <option value="Sr. Salesman" ${tag.rank === 'Sr. Salesman' ? 'selected' : ''}>Sr. Salesman</option>
                <option value="Jr. Salesman" ${tag.rank === 'Jr. Salesman' ? 'selected' : ''}>Jr. Salesman</option>
                <option value="Towing Specialist" ${tag.rank === 'Towing Specialist' ? 'selected' : ''}>Towing Specialist</option>
                <option value="Tow Operator" ${tag.rank === 'Tow Operator' ? 'selected' : ''}>Tow Operator</option>
                <option value="Truck Driver" ${tag.rank === 'Truck Driver' ? 'selected' : ''}>Truck Driver</option>
              </select>
              <button class="modern-btn-delete" onclick="deleteTag('${escapeHtml(tag.name).replace(/'/g, "\\'")}')">❌ Törlés</button>
            </div>
          </td>
        `;
      } else {
        // NEM ADMIN VAGY NINCS BEJELENTKEZVE - ÜRES CELL
        actionCell = '<td></td>';
      }
      
      row.innerHTML = `
        <td style="font-weight: 600; color: #2d3748;">${escapeHtml(tag.name)}</td>
        <td style="color: #4a5568;">${rankDisplay}</td>
        ${actionCell}
      `;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('renderTags hiba:', error);
    showTagMessage('Hiba történt a tagok megjelenítésekor', 'error');
  }
}

function getRankIcon(rank) {
  switch(rank) {
    case 'Owner': return '👑';
    case 'Co-Owner': return '💎';
    case 'Manager': return '💼';
    case 'Team Leader': return '⭐';
    case 'Top Salesman': return '🚀';
    case 'Sr. Salesman': return '🔶';
    case 'Jr. Salesman': return '🔹';
    case 'Towing Specialist': return '🔧';
    case 'Tow Operator': return '⚡';
    case 'Truck Driver': return '🚛';
    default: return '👤';
  }
}

// ===== KERESŐ FUNKCIÓK =====
function formatInputPrice(input) {
  try {
    const value = input.value.replace(/[^\d]/g, '');
    if (value) {
      const formatted = new Intl.NumberFormat('hu-HU').format(parseInt(value));
      input.value = formatted;
    }
  } catch (error) {
    console.error('formatInputPrice hiba:', error);
  }
}

function showModelDropdown() {
  try {
    const dropdown = document.getElementById('modelDropdown');
    if (!dropdown) return;
    
    const searchValue = document.getElementById('modelSearch').value.toLowerCase();
    
    if (searchValue === '') {
      renderModelDropdown(modelOptions);
    } else {
      filterModels();
    }
    
    dropdown.style.display = 'block';
  } catch (error) {
    console.error('showModelDropdown hiba:', error);
  }
}

function filterModels() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    try {
      const searchValue = document.getElementById('modelSearch').value.toLowerCase();
      const filteredModels = modelOptions.filter(model => 
        model.toLowerCase().includes(searchValue)
      );
      renderModelDropdown(filteredModels);
    } catch (error) {
      console.error('filterModels hiba:', error);
    }
  }, 300);
}

function renderModelDropdown(models) {
  try {
    const dropdown = document.getElementById('modelDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    if (models.length === 0) {
      dropdown.innerHTML = '<div class="model-option modern">Nincs találat</div>';
      return;
    }
    
    models.forEach(model => {
      const option = document.createElement('div');
      option.className = 'model-option modern';
      option.textContent = escapeHtml(model);
      option.onclick = () => onModelSelected(model);
      dropdown.appendChild(option);
    });
  } catch (error) {
    console.error('renderModelDropdown hiba:', error);
  }
}

function onModelSelected(model) {
  try {
    document.getElementById('modelSearch').value = model;
    document.getElementById('modelDropdown').style.display = 'none';
  } catch (error) {
    console.error('onModelSelected hiba:', error);
  }
}

// ===== MODAL FUNKCIÓK =====
function openSoldModal(carId) {
  const car = allCars.find(c => c.id === carId);
  if (!car) return;

  currentCarIdForSale = carId;
  
  // Kép beállítása
  const carImage = document.getElementById('editCarImage');
  const imageUrl = getImageUrl(car.image_url || car.image_data_url);
  if (imageUrl && !imageUrl.includes('undefined')) {
    carImage.src = imageUrl;
    carImage.style.display = 'block';
  } else {
    carImage.style.display = 'none';
  }
  
  // Autó adatok
  document.getElementById('editCarModel').textContent = car.Model || 'Ismeretlen modell';
  document.getElementById('editPurchasePrice').textContent = car.VetelArFormatted ? car.VetelArFormatted + ' $' : 'Nincs megadva';
  document.getElementById('editCurrentPrice').textContent = car.EladasiArFormatted ? car.EladasiArFormatted + ' $' : 'Nincs megadva';
  
  // Eladási ár input
  document.getElementById('editSalePrice').value = car.EladasiArFormatted || '';
  
  // Profit számoló frissítése
  updateProfitCalculator();
  
  // Modal megjelenítése
  document.getElementById('editSaleModal').style.display = 'block';
  
  // Input fókusz
  setTimeout(() => {
    document.getElementById('editSalePrice').focus();
  }, 300);
}

function closeEditModal() {
  document.getElementById('editSaleModal').style.display = 'none';
  currentCarIdForSale = null;
}

// Profit számoló frissítése
function updateProfitCalculator() {
  const salePriceInput = document.getElementById('editSalePrice').value.replace(/[^\d]/g, '');
  const salePrice = salePriceInput ? parseInt(salePriceInput) : 0;
  
  const car = allCars.find(c => c.id === currentCarIdForSale);
  const purchasePrice = car.VetelAr || 0;
  
  const profitCalc = document.getElementById('profitCalc');
  
  if (salePrice > 0 && purchasePrice > 0) {
    const profit = salePrice - purchasePrice;
    const profitFormatted = new Intl.NumberFormat('hu-HU').format(Math.abs(profit));
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    
    document.getElementById('calcPurchase').textContent = new Intl.NumberFormat('hu-HU').format(purchasePrice) + ' $';
    document.getElementById('calcSale').textContent = new Intl.NumberFormat('hu-HU').format(salePrice) + ' $';
    document.getElementById('calcProfit').textContent = (profit >= 0 ? '+' : '-') + profitFormatted + ' $';
    document.getElementById('calcProfit').className = profitClass;
    
    profitCalc.style.display = 'block';
  } else {
    profitCalc.style.display = 'none';
  }
}

async function confirmSaleWithEdit() {
  if (!currentCarIdForSale || !currentUser) return;

  const salePriceInput = document.getElementById('editSalePrice').value.replace(/[^\d]/g, '');
  const salePriceValue = salePriceInput ? parseInt(salePriceInput) : null;

  if (salePriceValue !== null && isNaN(salePriceValue)) {
    showMessage('Érvényes számot adj meg!', 'error');
    return;
  }

  const car = allCars.find(c => c.id === currentCarIdForSale);
  
  // Vételár ellenőrzése
  if (salePriceValue !== null && car.VetelAr && salePriceValue < car.VetelAr) {
    const confirmLoss = confirm(`⚠️ Figyelem! Az eladási ár (${new Intl.NumberFormat('hu-HU').format(salePriceValue)} $) alacsonyabb a vételárnál (${new Intl.NumberFormat('hu-HU').format(car.VetelAr)} $).\n\nBiztosan folytatod?`);
    if (!confirmLoss) return;
  }

  const { error } = await supabase
    .from('cars')
    .update({ 
      sold: true,
      sold_by: currentUser.tagName,
      sold_at: new Date().toISOString(),
      sale_price: salePriceValue
    })
    .eq('id', currentCarIdForSale);

  if (error) {
    showMessage('Hiba: ' + error.message, 'error');
  } else {
    const priceInfo = salePriceValue ? ` (${new Intl.NumberFormat('hu-HU').format(salePriceValue)} $)` : '';
    showMessage(`✅ Autó eladva${priceInfo}! (Eladó: ${currentUser.tagName})`, 'success');
    loadCars();
    loadStats();
  }

  closeEditModal();
}

// ===== MÓDOSÍTÓ FUNKCIÓK =====
async function addCar() {
  try {
    if (!currentUser) {
      showMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    const selectedModel = document.getElementById('modelSearch').value.trim();
    const selectedTuning = Array.from(document.querySelectorAll('.modern-tuning-option.selected'))
      .map(div => div.textContent)
      .join(', ');

    if (!selectedModel) {
      showMessage('Válassz modellt!', 'warning');
      return;
    }

    const vetelAr = document.getElementById('vetel').value.replace(/[^\d]/g, '');
    const kivantAr = document.getElementById('kivant').value.replace(/[^\d]/g, '');
    const eladasiAr = document.getElementById('eladas').value.replace(/[^\d]/g, '');

    // KÉP KEZELÉS
    let imageDataUrl = null;
    if (selectedImage && selectedImage.dataUrl) {
      imageDataUrl = selectedImage.dataUrl;
    }

    const carData = {
      model: selectedModel,
      tuning: selectedTuning,
      purchase_price: vetelAr ? parseInt(vetelAr) : null,
      desired_price: kivantAr ? parseInt(kivantAr) : null,
      sale_price: eladasiAr ? parseInt(eladasiAr) : null,
      added_by: currentUser.tagName,
      sold: false,
      image_data_url: imageDataUrl
    };

    const { data, error } = await supabase
      .from('cars')
      .insert([carData])
      .select();

    if (error) {
      console.error('❌ Autó hozzáadás hiba:', error);
      showMessage('Hiba az autó hozzáadásában: ' + error.message, 'error');
    } else {
      console.log('✅ Autó hozzáadva:', data);
      showMessage('Autó sikeresen hozzáadva!', 'success');
      clearInputs();
      clearImage();
      loadCars();
      loadStats();
    }

  } catch (error) {
    console.error('addCar hiba:', error);
    showMessage('Hiba történt az autó hozzáadása során', 'error');
  }
}

async function deleteCar(carId) {
  try {
    if (!currentUser) {
      showMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      showMessage('Autó nem található!', 'error');
      return;
    }

    if (car.added_by !== currentUser.tagName && currentUser.role !== 'admin') {
      showMessage('Csak a saját autódat törölheted!', 'error');
      return;
    }

    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', carId);

    if (error) {
      showMessage('Hiba történt a törlés során: ' + error.message, 'error');
    } else {
      showMessage('Autó sikeresen törölve!', 'success');
      loadCars();
      loadStats();
    }
  } catch (error) {
    console.error('deleteCar hiba:', error);
    showMessage('Hiba történt a törlés során', 'error');
  }
}

async function addTag() {
  try {
    if (!currentUser) {
      showTagMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    if (currentUser.role !== 'admin') {
      showTagMessage('Csak admin adhat hozzá tagot!', 'error');
      return;
    }

    const newTag = document.getElementById('newTag').value.trim();
    if (!newTag) {
      showTagMessage('Írj be egy tag nevet!', 'warning');
      return;
    }

    const { error } = await supabase
      .from('members')
      .insert([{ name: newTag }]);

    if (error) {
      if (error.code === '23505') {
        showTagMessage('Ez a tag már létezik!', 'error');
      } else {
        showTagMessage('Hiba: ' + error.message, 'error');
      }
    } else {
      showTagMessage('Tag hozzáadva!');
      document.getElementById('newTag').value = '';
      loadTags();
      loadTagOptions();
      loadStats();
    }
  } catch (error) {
    console.error('addTag hiba:', error);
    showTagMessage('Hiba történt a tag hozzáadása során', 'error');
  }
}

async function deleteTag(tagName) {
  try {
    if (!currentUser) {
      showTagMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    if (currentUser.role !== 'admin') {
      showTagMessage('Csak admin törölhet tagot!', 'error');
      return;
    }

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('name', tagName);

    if (error) {
      showTagMessage('Hiba: ' + error.message, 'error');
    } else {
      showTagMessage('Tag törölve!');
      loadTags();
      loadTagOptions();
      loadStats();
    }
  } catch (error) {
    console.error('deleteTag hiba:', error);
    showTagMessage('Hiba történt a tag törlése során', 'error');
  }
}

// ===== RANG FRISSÍTÉS =====
async function updateTagRank(tagName, newRank) {
  try {
    if (!currentUser) {
      showTagMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    if (currentUser.role !== 'admin') {
      showTagMessage('Csak admin módosíthat rangot!', 'error');
      return;
    }

    const { error } = await supabase
      .from('members')
      .update({ rank: newRank })
      .eq('name', tagName);

    if (error) {
      showTagMessage('Hiba: ' + error.message, 'error');
    } else {
      showTagMessage('Rang frissítve!');
      loadTags();
    }
  } catch (error) {
    console.error('updateTagRank hiba:', error);
    showTagMessage('Hiba történt a rang frissítése során', 'error');
  }
}

function clearInputs() {
  try {
    document.getElementById('modelSearch').value = '';
    document.getElementById('vetel').value = '';
    document.getElementById('kivant').value = '';
    document.getElementById('eladas').value = '';
    document.getElementById('newTag').value = '';
    document.querySelectorAll('.modern-tuning-option').forEach(div => div.classList.remove('selected'));
    document.getElementById('modelDropdown').style.display = 'none';
    clearImage();
  } catch (error) {
    console.error('clearInputs hiba:', error);
  }
}

// ===== MODERN LOGIN FUNKCIÓK =====

// Enter billentyű kezelése
function setupEnterKeyListener() {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (loginForm) {
    // Form submit esemény
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
    
    // Input mezők Enter eseménye
    [usernameInput, passwordInput].forEach(input => {
      if (input) {
        input.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleLogin();
          }
        });
      }
    });
  }
}

// Modern login handler
async function handleLogin() {
  const loginButton = document.getElementById('loginButton');
  const originalText = loginButton.innerHTML;
  
  try {
    // Loading állapot
    loginButton.innerHTML = '⏳ Bejelentkezés...';
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    
    await login();
    
  } catch (error) {
    console.error('Login hiba:', error);
  } finally {
    // Visszaállítás
    loginButton.innerHTML = originalText;
    loginButton.classList.remove('loading');
    loginButton.disabled = false;
  }
}

// ===== OLDAL BETÖLTÉSE =====
window.onload = async () => {
    try {
        console.log('🔄 Oldal betöltése...');
        
        // ELŐSZÖR: Próbáljuk meg betölteni a mentett bejelentkezést
        const savedUser = loadLoginState();
        if (savedUser) {
            console.log('✅ Automatikus bejelentkezés:', savedUser.tagName);
            currentUser = savedUser;
            
            // UI frissítése
            updateUIForLoginState();
        } else {
            console.log('ℹ️ Nincs mentett bejelentkezés');
            updateUIForLoginState();
        }
        
        // Adatok betöltése
        await loadAllData();
        showPage('autok');
        
    } catch (error) {
        console.error('❌ Window load hiba:', error);
        showMessage('Hiba történt az oldal betöltésekor', 'error');
    }
};

// Event listener-ek
document.addEventListener('click', function(event) {
  try {
    const modelDropdown = document.getElementById('modelDropdown');
    const modelSearch = document.getElementById('modelSearch');
    
    if (modelSearch && modelDropdown && !modelSearch.contains(event.target) && !modelDropdown.contains(event.target)) {
      modelDropdown.style.display = 'none';
    }
  } catch (error) {
    console.error('Dropdown click handler hiba:', error);
  }
});

// Profit számoló event listener
document.addEventListener('DOMContentLoaded', function() {
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.addEventListener('input', function() {
      formatInputPrice(this);
      updateProfitCalculator();
    });
  }
});

// Modal bezárása kattintásra
document.addEventListener('click', function(event) {
  const modal = document.getElementById('editSaleModal');
  if (event.target === modal) {
    closeEditModal();
  }
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  showMessage('Váratlan hiba történt', 'error');
});
// === FRISSÍTÉS FUNKCIÓ ===
async function refreshAllData() {
    try {
        console.log('🔄 Összes adat frissítése...');
        
        // Loading állapot
        const refreshBtn = document.querySelector('.modern-btn-refresh');
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '⏳ Frissítés...';
        refreshBtn.disabled = true;
        
        // Összes adat újratöltése
        await loadAllData();
        
        // Statisztika frissítése (ha a statisztika oldalon van)
        if (document.getElementById('statisztikaPage').classList.contains('active')) {
            loadStats();
        }
        
        // Visszaállítás
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        
        showMessage('✅ Összes adat frissítve!', 'success');
        console.log('✅ Frissítés kész');
        
    } catch (error) {
        console.error('❌ Frissítés hiba:', error);
        showMessage('❌ Hiba történt a frissítés során', 'error');
        
        // Hiba esetén is visszaállítás
        const refreshBtn = document.querySelector('.modern-btn-refresh');
        if (refreshBtn) {
            refreshBtn.innerHTML = '🔄 Összes adat frissítése';
            refreshBtn.disabled = false;
        }
    }
}
// === SZŰRÉSI FUNKCIÓK ===
let currentFilters = {
    user: '',
    status: ''
};

function loadUserFilter() {
    const userFilter = document.getElementById('filterByUser');
    if (!userFilter) return;
    
    const uniqueUsers = [...new Set(allCars.map(car => car.Hozzáadta).filter(Boolean))];
    userFilter.innerHTML = '<option value="">Összes</option>';
    
    uniqueUsers.sort().forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userFilter.appendChild(option);
    });
}

function filterCars() {
    const userFilter = document.getElementById('filterByUser');
    const statusFilter = document.getElementById('filterByStatus');
    
    currentFilters.user = userFilter.value;
    currentFilters.status = statusFilter.value;
    applyFilters();
}

function applyFilters() {
    let filteredCars = [...allCars];
    
    if (currentFilters.user) {
        filteredCars = filteredCars.filter(car => car.Hozzáadta === currentFilters.user);
    }
    
    if (currentFilters.status) {
        if (currentFilters.status === 'available') {
            filteredCars = filteredCars.filter(car => !car.Eladva);
        } else if (currentFilters.status === 'sold') {
            filteredCars = filteredCars.filter(car => car.Eladva);
        }
    }
    
    renderCars(filteredCars);
    updateFilterInfo();
}

// Szűrő információk frissítése
function updateFilterInfo() {
    const filterInfo = document.getElementById('filterInfo');
    if (!filterInfo) return;
    
    const activeFilters = Object.values(currentFilters).filter(Boolean);
    
    if (activeFilters.length === 0) {
        filterInfo.style.display = 'none';
        return;
    }
    
    let filterText = '';
    const filterParts = [];
    
    if (currentFilters.user) {
        filterParts.push(`Felhasználó: ${currentFilters.user}`);
    }
    if (currentFilters.status) {
        const statusText = currentFilters.status === 'available' ? 'Eladó' : 'Eladva';
        filterParts.push(`Státusz: ${statusText}`);
    }
    
    const displayedCars = document.getElementById('carTableBody').children.length;
    const totalCars = allCars.length;
    
    filterInfo.innerHTML = `
        <h4>🔍 Aktív szűrők</h4>
        <p>${filterParts.join(' • ')}</p>
        <p><small>Megjelenítve: ${displayedCars} / ${totalCars} autó</small></p>
    `;
    filterInfo.style.display = 'block';
}

// Szűrők törlése
function clearFilters() {
    currentFilters = {
        user: '',
        status: ''
    };
    
    document.getElementById('filterByUser').value = '';
    document.getElementById('filterByStatus').value = '';
    
    renderCars(allCars);
    const filterInfo = document.getElementById('filterInfo');
    if (filterInfo) filterInfo.style.display = 'none';
    
    showMessage('✅ Szűrők törölve', 'success');
}

// Szűrő dropdown frissítése
function updateFilterModelDropdown() {
  const dropdown = document.getElementById('filterModelDropdown');
  if (!dropdown) return;
  
  renderFilterModelDropdown(modelOptions);
}

// Automatikus kiegészítés a szűrőhöz
function showFilterModelDropdown() {
  const dropdown = document.getElementById('filterModelDropdown');
  const searchValue = document.getElementById('filterByModel').value.toLowerCase();
  
  if (searchValue === '') {
    renderFilterModelDropdown(modelOptions.slice(0, 10)); // Csak első 10 modell
  } else {
    const filteredModels = modelOptions.filter(model => 
      model.toLowerCase().includes(searchValue)
    ).slice(0, 10); // Maximum 10 találat
    renderFilterModelDropdown(filteredModels);
  }
  
  dropdown.style.display = 'block';
}

// Autók betöltése után frissítsd a szűrőt
async function loadCars() {
    try {
        const { data, error } = await supabase
            .from('cars')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allCars = data || [];
        
        allCars = allCars.map(car => ({
            ...car,
            VetelArFormatted: car.purchase_price ? new Intl.NumberFormat('hu-HU').format(car.purchase_price) : '',
            KivantArFormatted: car.desired_price ? new Intl.NumberFormat('hu-HU').format(car.desired_price) : '',
            EladasiArFormatted: car.sale_price ? new Intl.NumberFormat('hu-HU').format(car.sale_price) : '',
            Model: car.model,
            Tuning: car.tuning,
            VetelAr: car.purchase_price,
            KivantAr: car.desired_price,
            EladasiAr: car.sale_price,
            Eladva: car.sold,
            Hozzáadta: car.added_by,
            KepURL: getImageUrl(car.image_url),
            sold_by: car.sold_by,
            sold_at: car.sold_at
        }));
        
        renderCars(allCars);
        loadUserFilter(); // Szűrő frissítése
        updateFilterInfo();
    } catch (error) {
        console.error('Cars load error:', error);
        showMessage('Hiba történt az autók betöltésekor', 'error');
    }
}

// Gyorsbillentyű hozzáadása (F5) - mindig működik
document.addEventListener('keydown', function(e) {
    if (e.key === 'F5') {
        e.preventDefault();
        refreshAllData();
    }
});