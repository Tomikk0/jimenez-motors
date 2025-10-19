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
let currentKickMemberName = null;
let gallerySelectedImage = null;

// === BIZTONSÁGI ELLENŐRZÉS ===

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function checkAdminAccess() {
    if (!isAdmin()) {
        showTagMessage('🔒 Nincs jogosultságod ehhez a művelethez!', 'error');
        return false;
    }
    return true;
}

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
    const isAdminUser = isAdmin();
    
       // ÚJ: Ha épp olyan oldalon vagyunk, ami nem elérhető, akkor váltunk
    const currentPage = localStorage.getItem('jimenezMotors_currentPage');
    if (currentPage) {
        if ((currentPage === 'statisztika' || currentPage === 'autokKepek') && !isLoggedIn) {
            console.log('🔄 Visszatérés az autók oldalra, mert a jelenlegi oldal nem elérhető');
            setTimeout(() => showPage('autok'), 100);
        }
    }
    
    console.log('✅ UI frissítve, logged-in:', isLoggedIn, 'admin:', isAdminUser);
    // Admin funkciók
    const adminFunctions = document.getElementById('adminFunctions');
    if (adminFunctions) adminFunctions.style.display = isLoggedIn ? 'block' : 'none';
    
    // Tag admin funkciók
    const tagAdminFunctions = document.getElementById('tagAdminFunctions');
    if (tagAdminFunctions) tagAdminFunctions.style.display = isAdminUser ? 'block' : 'none';
    
        // Jelszóváltoztatás gomb kezelése
    const passwordButtons = document.querySelectorAll('.password-btn');
    passwordButtons.forEach(btn => {
        btn.style.display = isLoggedIn ? 'inline-block' : 'none';
    });
    
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

    // Galéria admin funkciók
    const galleryAdminFunctions = document.getElementById('galleryAdminFunctions');
    if (galleryAdminFunctions) {
        galleryAdminFunctions.style.display = isLoggedIn ? 'block' : 'none';
    }
    
    // Galéria művelet oszlop
    const galleryActionHeader = document.getElementById('galleryActionHeader');
    if (galleryActionHeader) {
        galleryActionHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    }
    
    // Táblázat fejlécek
    const kivantHeader = document.getElementById('kivantHeader');
    const actionHeader = document.getElementById('actionHeader');
    const tagActionHeader = document.getElementById('tagActionHeader');
    const vetelHeader = document.getElementById('vetelHeader');
    const keszpenzHeader = document.getElementById('keszpenzHeader');
    const historyButton = document.getElementById('historyButton');
    const badgeButton = document.getElementById('badgeButton');

    if (kivantHeader) kivantHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (actionHeader) actionHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (tagActionHeader) tagActionHeader.style.display = isAdminUser ? 'table-cell' : 'none';
    if (vetelHeader) vetelHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
    if (keszpenzHeader) keszpenzHeader.style.display = isLoggedIn ? 'none' : 'table-cell';
    
    // TAG TÖRTÉNET GOMB - CSAK ADMINOKNAK
    if (historyButton) {
        historyButton.style.display = isAdminUser ? 'flex' : 'none';
    }
    
    // KITŰZŐ GOMB - CSAK ADMINOKNAK
    if (badgeButton) {
        badgeButton.style.display = isAdminUser ? 'flex' : 'none';
    }
    
    // Body class-ok
    document.body.classList.toggle('logged-in', isLoggedIn);
    document.body.classList.toggle('admin', isAdminUser);
    
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
    
    // Statisztika gomb
    updateStatisztikaButton();
    
    // Tagok újratöltése a megfelelő oszlopokkal
    loadTags();
    
    // Tuning admin funkciók - CSAK ADMINOKNAK
    const tuningAdminFunctions = document.getElementById('tuningAdminFunctions');
    if (tuningAdminFunctions) {
        tuningAdminFunctions.style.display = isAdminUser ? 'block' : 'none';
    }
    
    // Tuning művelet oszlop - CSAK ADMINOKNAK
    const tuningActionHeader = document.getElementById('tuningActionHeader');
    if (tuningActionHeader) {
        tuningActionHeader.style.display = isAdminUser ? 'table-cell' : 'none';
    }
    
    // ... a többi kód változatlan ...
    
    // Tuningok gomb
    const tuningBtn = document.querySelector('.nav-btn[onclick="showPage(\'tuningok\')"]');
    if (tuningBtn) {
        tuningBtn.style.display = isLoggedIn ? 'inline-block' : 'none';
    }
    
    console.log('✅ UI frissítve, logged-in:', isLoggedIn, 'admin:', isAdminUser);
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
        
        // Ellenőrizzük, hogy az oldal elérhető-e
        if ((pageName === 'statisztika' || pageName === 'autokKepek' || pageName === 'tuningok') && !currentUser) {
            console.log('🚫 Oldal nem elérhető, vissza autókra');
            pageName = 'autok';
        }
    
    // Összes oldal elrejtése
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => {
      page.classList.remove('active');
    });
    
    // 👇 MÓDOSÍTOTT RÉSZ: Összes nav-btn aktív állapotának eltávolítása
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
      
      // 👇 MÓDOSÍTOTT RÉSZ: Aktív gomb beállítása - MINDEN NAV-BAN
      const allActiveButtons = document.querySelectorAll(`.nav-btn[onclick="showPage('${pageName}')"]`);
      allActiveButtons.forEach(btn => {
        btn.classList.add('active');
      });
      
      // Login oldal speciális kezelése
      if (pageName === 'login') {
        setTimeout(() => {
          setupEnterKeyListener();
          const usernameInput = document.getElementById('username');
          if (usernameInput) usernameInput.focus();
        }, 100);
      }
    }
    
switch(pageName) {
            case 'autok':
                console.log('🚗 Autók betöltése...');
                loadCars();
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

// === JELSZÓVÁLTOZTATÁS FUNKCIÓK ===

// Jelszóváltoztatás modal megnyitása - DEBUG VERZIÓ
function openChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal megnyitása...');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('❌ Nincs bejelentkezve!');
        showMessage('Előbb jelentkezz be!', 'warning');
        return;
    }
    
    const modal = document.getElementById('changePasswordModal');
    console.log('Modal elem:', modal);
    
    if (!modal) {
        console.error('❌ changePasswordModal nem található!');
        showMessage('Hiba: a jelszóváltoztatás modal nem található', 'error');
        return;
    }
    
    modal.style.display = 'block';
    console.log('✅ Modal megjelenítve');
    
    // Mezők ürítése
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Üzenet elrejtése
    const messageEl = document.getElementById('changePasswordMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    setTimeout(() => {
        document.getElementById('currentPassword').focus();
    }, 300);
}

// Jelszóváltoztatás modal bezárása
function closeChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal bezárása');
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function changePassword() {
    try {
        if (!currentUser) {
            showChangePasswordMessage('Nincs bejelentkezve!', 'error');
            return;
        }
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showChangePasswordMessage('Minden mező kitöltése kötelező!', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showChangePasswordMessage('Az új jelszavak nem egyeznek!', 'error');
            return;
        }
        
        if (newPassword.length < 4) {
            showChangePasswordMessage('Az új jelszó legalább 4 karakter hosszú legyen!', 'error');
            return;
        }
        
        // Jelenlegi jelszó ellenőrzése
        const { data: users, error: checkError } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', currentUser.username);
        
        if (checkError || !users || users.length === 0) {
            showChangePasswordMessage('Hiba történt az ellenőrzés során!', 'error');
            return;
        }
        
        const user = users[0];
        
        // Base64 ellenőrzés
        if (user.password_hash !== btoa(currentPassword)) {
            showChangePasswordMessage('A jelenlegi jelszó nem megfelelő!', 'error');
            return;
        }
        
        // Új jelszó hash-elése (base64)
        const newPasswordHash = btoa(newPassword);
        
        // Jelszó frissítése - CSAK a password_hash mezőt frissítjük
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ 
                password_hash: newPasswordHash
                // ELTÁVOLÍTVA: updated_at: new Date().toISOString()
            })
            .eq('username', currentUser.username);
        
        if (updateError) {
            console.error('Jelszóváltoztatás hiba:', updateError);
            showChangePasswordMessage('Hiba történt a jelszó megváltoztatása során: ' + updateError.message, 'error');
        } else {
            showChangePasswordMessage('✅ Jelszó sikeresen megváltoztatva!', 'success');
            
            setTimeout(() => {
                closeChangePasswordModal();
                showMessage('Jelszó sikeresen megváltoztatva!', 'success');
            }, 2000);
        }
        
    } catch (error) {
        console.error('changePassword hiba:', error);
        showChangePasswordMessage('Váratlan hiba történt!', 'error');
    }
}

// Jelszóváltoztatás üzenetek
function showChangePasswordMessage(text, type = 'success') {
    const messageEl = document.getElementById('changePasswordMessage');
    if (!messageEl) {
        console.error('❌ changePasswordMessage elem nem található!');
        return;
    }
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    console.log('📢 Jelszóváltoztatás üzenet:', text, type);
}

// Event listener-ek hozzáadása
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Jelszóváltoztatás event listener-ek beállítása...');
    
    // Enter billentyű kezelése a jelszóváltoztatás modalban
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        console.log('✅ changePasswordModal elem megtalálva');
        const inputs = changePasswordModal.querySelectorAll('input[type="password"]');
        inputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter lenyomva a jelszóváltoztatásban');
                    changePassword();
                }
            });
        });
    } else {
        console.error('❌ changePasswordModal elem nem található!');
    }
    
    // Modal bezárás kattintásra
    document.addEventListener('click', function(event) {
        const changePasswordModal = document.getElementById('changePasswordModal');
        if (event.target === changePasswordModal) {
            console.log('📌 Modal bezárása kattintásra');
            closeChangePasswordModal();
        }
    });
});

// === TUNING KEZELÉSI FUNKCIÓK ===

// Tuningok betöltése
async function loadTunings() {
    try {
        const { data: tunings, error } = await supabase
            .from('tuning_options')
            .select('*')
            .order('name');

        if (error) throw error;
        
        renderTunings(tunings || []);
    } catch (error) {
        console.error('Tunings load error:', error);
        showTuningMessage('Hiba történt a tuningok betöltésekor', 'error');
    }
}

// Tuningok megjelenítése
function renderTunings(tunings) {
    const tbody = document.getElementById('tuningTableBody');
    
    if (!tunings || tunings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="empty-table-message">
                    🔧 Nincsenek tuning csomagok<br>
                    <small style="opacity: 0.7;">Adj hozzá egy új tuning csomagot a fenti űrlappal!</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    
    tunings.forEach(tuning => {
        const row = document.createElement('tr');
        
        // Ár formázása
        const ar = tuning.price ? new Intl.NumberFormat('hu-HU').format(tuning.price) + ' $' : '-';
        
        // MŰVELET GOMBOK - CSAK ADMINOKNAK
        let actionCell = '';
        if (currentUser && isAdmin()) {
            actionCell = `
                <td class="action-cell">
                    <div class="modern-action-buttons">
                        <button class="modern-btn-delete" onclick="deleteTuning(${tuning.id})">❌ Törlés</button>
                    </div>
                </td>
            `;
        } else {
            actionCell = '';
        }
        
        row.innerHTML = `
            <td style="font-weight: 600; color: #2d3748;">${escapeHtml(tuning.name || '')}</td>
            <td class="price-cell price-sale">${ar}</td>
            ${actionCell}
        `;
        
        tbody.appendChild(row);
    });
}

// Új tuning hozzáadása
async function addTuning() {
    try {
        if (!checkAdminAccess()) return;

        const name = document.getElementById('tuningName').value.trim();
        const price = document.getElementById('tuningPrice').value.replace(/[^\d]/g, '');

        if (!name) {
            showTuningMessage('Add meg a tuning nevét!', 'warning');
            return;
        }

        if (!price) {
            showTuningMessage('Add meg az árat!', 'warning');
            return;
        }

        const tuningData = {
            name: name,
            price: parseInt(price),
            created_by: currentUser.tagName
        };

        const { data, error } = await supabase
            .from('tuning_options')
            .insert([tuningData])
            .select();

        if (error) {
            console.error('❌ Tuning hozzáadás hiba:', error);
            showTuningMessage('Hiba a tuning hozzáadásában: ' + error.message, 'error');
        } else {
            console.log('✅ Tuning hozzáadva:', data);
            showTuningMessage('Tuning csomag sikeresen hozzáadva!', 'success');
            clearTuningForm();
            loadTunings();
        }

    } catch (error) {
        console.error('addTuning hiba:', error);
        showTuningMessage('Hiba történt a tuning hozzáadása során', 'error');
    }
}

// Tuning törlése - CSAK ADMIN (megerősítés nélkül)
async function deleteTuning(tuningId) {
    try {
        if (!checkAdminAccess()) return;

        // NINCS megerősítő felugró ablak - azonnal törlés
        const { error } = await supabase
            .from('tuning_options')
            .delete()
            .eq('id', tuningId);

        if (error) {
            showTuningMessage('Hiba történt a törlés során: ' + error.message, 'error');
        } else {
            showTuningMessage('Tuning csomag sikeresen törölve!', 'success');
            loadTunings();
        }
    } catch (error) {
        console.error('deleteTuning hiba:', error);
        showTuningMessage('Hiba történt a törlés során', 'error');
    }
}

// Tuning űrlap törlése
function clearTuningForm() {
    document.getElementById('tuningName').value = '';
    document.getElementById('tuningPrice').value = '';
}

// Tuning üzenetek
function showTuningMessage(text, type = 'success') {
    const messageEl = document.getElementById('tuningMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

// Aktuális oldal mentése
function saveCurrentPage(pageName) {
  try {
    localStorage.setItem('jimenezMotors_currentPage', pageName);
    console.log('💾 Oldal mentve:', pageName);
  } catch (error) {
    console.error('❌ Hiba az oldal mentésekor:', error);
  }
}

// Aktuális oldal betöltése
// Aktuális oldal betöltése
function loadCurrentPage() {
  try {
    const savedPage = localStorage.getItem('jimenezMotors_currentPage');
    console.log('📖 Mentett oldal betöltése:', savedPage);
    
    // Ha nincs mentett oldal, akkor alapértelmezett az autók oldal
    if (!savedPage) {
      console.log('ℹ️ Nincs mentett oldal, alapértelmezett: autok');
      return 'autok';
    }
    
    // Ellenőrizzük, hogy a mentett oldal elérhető-e a jelenlegi bejelentkezési állapottal
    const isLoggedIn = !!currentUser;
    
    if ((savedPage === 'statisztika' || savedPage === 'autokKepek') && !isLoggedIn) {
      console.log('ℹ️ A mentett oldal csak bejelentkezés után érhető el, vissza autókra');
      return 'autok';
    }
    
    // Ha a bejelentkezési oldalon vagyunk, de már be vagyunk jelentkezve
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

// Galéria kép kiválasztása
function handleGalleryImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        showGalleryMessage('A kép mérete túl nagy! Maximum 5MB lehet.', 'error');
        return;
    }

    if (!file.type.match('image.*')) {
        showGalleryMessage('Csak képeket tölthetsz fel!', 'error');
        return;
    }

    document.getElementById('galleryImageFileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('galleryImagePreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="Előnézet">`;
        
        gallerySelectedImage = {
            dataUrl: e.target.result,
            name: file.name
        };
    };
    reader.readAsDataURL(file);
}

// Galéria kép törlése
function clearGalleryImage() {
    document.getElementById('galleryCarImage').value = '';
    document.getElementById('galleryImageFileName').textContent = 'Nincs kép kiválasztva';
    document.getElementById('galleryImagePreview').innerHTML = '';
    gallerySelectedImage = null;
}

function showImageModal(imageUrl) {
  console.log('🖼 Modal megnyitása képhez:', imageUrl);
  
  if (!imageUrl || imageUrl === '' || imageUrl.includes('undefined')) {
    console.log('❌ Nincs érvényes kép URL');
    showMessage('Nincs elérhető kép a megjelenítéshez', 'warning');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.style.display = 'block';
  
  const img = document.createElement('img');
  img.className = 'modal-content';
  img.src = imageUrl;
  img.alt = 'Autó kép';
  
  img.onload = function() {
    console.log('✅ Kép sikeresen betöltve');
  };
  
  img.onerror = function() {
    console.log('❌ Kép betöltési hiba');
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPktJUCBNRSBNVUtPRElLPC90ZXh0Pgo8L3N2Zz4=';
  };

  const closeSpan = document.createElement('span');
  closeSpan.className = 'close-modal';
  closeSpan.innerHTML = '&times;';
  closeSpan.onclick = function() {
    modal.style.display = 'none';
    document.body.removeChild(modal);
  };

  modal.appendChild(closeSpan);
  modal.appendChild(img);

  document.body.appendChild(modal);

  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.removeChild(modal);
    }
  };

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
      ];
    }
    
    renderTuningOptions(tuningOptions);
  } catch (error) {
    console.error('Tuning options load error:', error);
    tuningOptions = [
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
            .eq('is_gallery', false) // CSAK a nem galéria autók
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
            const colCount = currentUser ? 10 : 8;
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

            if (imageUrl && !imageUrl.includes('undefined')) {
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
            
            // ÁRAK
            const vetelAr = c.VetelArFormatted || '';
            const kivantAr = c.KivantArFormatted || '';
            const eladasiAr = c.EladasiArFormatted || '';
            
            // KÉSZPÉNZ ÁR számolása (eladási ár 93%-a)
            let keszpenzAr = '';
            if (c.EladasiAr && !isNaN(c.EladasiAr)) {
                const keszpenzErtek = Math.round(c.EladasiAr * 0.93);
                keszpenzAr = new Intl.NumberFormat('hu-HU').format(keszpenzErtek);
            }
            
            let vetelArCell = '';
            let kivantArCell = '';
            let keszpenzArCell = '';
            
            if (currentUser) {
                vetelArCell = `<td class="price-cell price-purchase">${vetelAr ? vetelAr + ' $' : '-'}</td>`;
                kivantArCell = `<td class="price-cell price-desired">${kivantAr ? kivantAr + ' $' : '-'}</td>`;
                keszpenzArCell = '';
            } else {
                vetelArCell = '';
                kivantArCell = '';
                keszpenzArCell = `<td class="price-cell price-keszpenz price-keszpenz-cell">${keszpenzAr ? keszpenzAr + ' $' : '-'}</td>`;
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
            
            // Hozzáadta oszlop
            let hozzaadtaCell = '';
            if (c.Hozzáadta) {
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
            
            // SOR ÖSSZEÁLLÍTÁSA
            if (currentUser) {
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
                row.innerHTML = `
                    ${imageHtml}
                    <td style="font-weight: 600; color: #2d3748;">${escapeHtml(c.Model || '')}</td>
                    <td style="color: #718096; font-size: 0.9em;">${escapeHtml(c.Tuning || '-')}</td>
                    <td class="price-cell price-sale">${eladasiAr ? eladasiAr + ' $' : '-'}</td>
                    ${keszpenzArCell}
                    ${hozzaadtaCell}
                    ${statusCell}
                `;
            }
            
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('renderCars hiba:', error);
        const tbody = document.getElementById('carTableBody');
        const colCount = currentUser ? 10 : 8;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colCount}" style="text-align: center; color: #e53e3e; padding: 20px;">
                    ❌ Hiba történt az autók betöltése során
                </td>
            </tr>
        `;
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
    image_data_url: imageDataUrl,
    is_gallery: false // EZ AZ ÚJ SOR - jelzi, hogy ez NEM galéria autó
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

// === TAG KEZELÉSI FUNKCIÓK ===

// Tag hozzáadása - CSAK ADMIN
async function addTag() {
    try {
        if (!checkAdminAccess()) return;

        const newTag = document.getElementById('newTag').value.trim();
        if (!newTag) {
            showTagMessage('Írj be egy tag nevet!', 'warning');
            return;
        }

        const { error } = await supabase
            .from('members')
            .insert([{ 
                name: newTag,
                created_by: currentUser.tagName
            }]);

        if (error) {
            if (error.code === '23505') {
                showTagMessage('Ez a tag már létezik!', 'error');
            } else {
                showTagMessage('Hiba: ' + error.message, 'error');
            }
        } else {
            showTagMessage('✅ Tag hozzáadva!');
            document.getElementById('newTag').value = '';
            loadTags();
            loadStats();
            
            // Naplóbejegyzés a felvételről
            await logMemberAction(newTag, 'added', ``);
        }
    } catch (error) {
        console.error('addTag hiba:', error);
        showTagMessage('Hiba történt a tag hozzáadása során', 'error');
    }
}

// Tag kirúgása - CSAK ADMIN
function openKickModal(memberName) {
    if (!checkAdminAccess()) return;
    
    currentKickMemberName = memberName;
    document.getElementById('kickMemberName').textContent = memberName;
    document.getElementById('kickReason').value = '';
    document.getElementById('kickModal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('kickReason').focus();
    }, 300);
}

function closeKickModal() {
    document.getElementById('kickModal').style.display = 'none';
    currentKickMemberName = null;
}

async function confirmKick() {
    if (!checkAdminAccess() || !currentKickMemberName) return;

    const reason = document.getElementById('kickReason').value.trim();
    if (!reason) {
        showTagMessage('Add meg a kirúgás indokát!', 'warning');
        return;
    }

    try {
        // Naplóbejegyzés először
        await logMemberAction(currentKickMemberName, 'kicked', reason);

        // Tag törlése az adatbázisból
        const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .eq('name', currentKickMemberName);

        if (deleteError) throw deleteError;

        showTagMessage(`✅ ${currentKickMemberName} sikeresen kirúgva és törölve!`);
        closeKickModal();
        loadTags();
        loadStats();
        
    } catch (error) {
        console.error('confirmKick hiba:', error);
        showTagMessage('Hiba történt a kirúgás során', 'error');
    }
}

// Naplóbejegyzés készítése
async function logMemberAction(memberName, action, reason) {
    try {
        const { error } = await supabase
            .from('member_history')
            .insert([{
                member_name: memberName,
                action: action,
                reason: reason,
                performed_by: currentUser.tagName
            }]);

        if (error) {
            console.error('Naplóbejegyzés hiba:', error);
        }
    } catch (error) {
        console.error('logMemberAction hiba:', error);
    }
}

// Tagok betöltése
async function loadTags() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

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
            id: tag.id,
            name: tag.name,
            rank: tag.rank
        }));
        
        renderTags(sortedTags);
    } catch (error) {
        console.error('Tags load error:', error);
        showTagMessage('Hiba történt a tagok betöltésekor', 'error');
    }
}

// Tagok megjelenítése
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
                let actionButtons = '';
                
                actionButtons += `
                    <select onchange="updateTagRank('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)" 
                            class="modern-input" style="padding: 8px; font-size: 0.85em; min-width: 140px; margin-bottom: 5px;">
                        <option value="">Válassz rangot...</option>
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
                        <option value="Member" ${tag.rank === 'Member' ? 'selected' : ''}>Member</option>
                    </select>
                    <button class="modern-btn-kick" onclick="openKickModal('${escapeHtml(tag.name).replace(/'/g, "\\'")}')">
                        🚫 Kirúgás
                    </button>
                `;
                
                actionCell = `
                    <td class="action-cell">
                        <div class="modern-action-buttons">
                            ${actionButtons}
                        </div>
                    </td>
                `;
            } else {
                // NEM ADMIN VAGY NINCS BEJELENTKEZVE - ÜRES CELL (de nem fehér karika)
                actionCell = '<td style="display: none;"></td>';
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

// Rang frissítése - CSAK ADMIN
async function updateTagRank(tagName, newRank) {
    try {
        if (!checkAdminAccess()) return;

        if (!newRank) return;

        const { error } = await supabase
            .from('members')
            .update({ rank: newRank })
            .eq('name', tagName);

        if (error) {
            showTagMessage('Hiba: ' + error.message, 'error');
        } else {
            showTagMessage('✅ Rang frissítve!');
            loadTags();
            
            await logMemberAction(tagName, 'rank_updated', 
                `${currentUser.tagName} megváltoztatta a rangját: ${newRank}`);
        }
    } catch (error) {
        console.error('updateTagRank hiba:', error);
        showTagMessage('Hiba történt a rang frissítése során', 'error');
    }
}

// Rang ikonok
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

// === TAG TÖRTÉNET NAPLÓ ===

// Kirúgott tagok naplójának megjelenítése - CSAK ADMIN
async function showKickedMembersHistory() {
    if (!checkAdminAccess()) return;

    try {
        document.getElementById('kickedMembersModal').style.display = 'block';
        
        // ÖSSZES tag történet betöltése (felvétel és kirúgás is)
        const { data, error } = await supabase
            .from('member_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderKickedMembersHistory(data || []);
        
    } catch (error) {
        console.error('showKickedMembersHistory hiba:', error);
        document.getElementById('kickedMembersList').innerHTML = `
            <div class="history-empty">
                ❌ Hiba történt a napló betöltése során
            </div>
        `;
    }
}

function closeKickedMembersModal() {
    document.getElementById('kickedMembersModal').style.display = 'none';
}

// Napló megjelenítése - ÖSSZES MŰVELET (felvétel és kirúgás)
function renderKickedMembersHistory(history) {
    const container = document.getElementById('kickedMembersList');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="history-empty">
                📝 Még nincs tag történet
            </div>
        `;
        return;
    }

    let html = '';
    
    history.forEach(record => {
        const date = new Date(record.created_at);
        const formattedDate = date.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Művelet ikon és szín
        let actionIcon = '';
        let actionColor = '';
        let actionText = '';
        
        switch(record.action) {
            case 'added':
                actionIcon = '➕';
                actionColor = '#48bb78';
                actionText = 'Felvéve';
                break;
            case 'kicked':
                actionIcon = '🚫';
                actionColor = '#e53e3e';
                actionText = 'Kirúgva';
                break;
            case 'rank_updated':
                actionIcon = '⭐';
                actionColor = '#d69e2e';
                actionText = 'Rang változás';
                break;
            default:
                actionIcon = '📝';
                actionColor = '#718096';
                actionText = record.action;
        }

        html += `
            <div class="history-item">
                <div class="history-header">
                    <div class="history-member-name">${escapeHtml(record.member_name)}</div>
                    <div class="history-date">${formattedDate}</div>
                </div>
                <div class="history-reason" style="border-left-color: ${actionColor}">
                    <strong>${actionIcon} ${actionText}</strong><br>
                    ${escapeHtml(record.reason)}
                </div>
                <div class="history-meta">
                    <span>Által:</span>
                    <span class="history-kicked-by">${escapeHtml(record.performed_by)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// === KITŰZŐ FUNKCIÓK ===

// Kitűző modal megnyitása - CSAK ADMINOKNAK
function openBadgeModal() {
    if (!checkAdminAccess()) return;
    
    document.getElementById('badgeModal').style.display = 'block';
    loadBadges();
    
    // Inputok ürítése
    document.getElementById('badgeRankSelect').value = '';
    document.getElementById('badgeNote').value = '';
}

// Kitűző modal bezárása
function closeBadgeModal() {
    document.getElementById('badgeModal').style.display = 'none';
}

// Segédfüggvény a megjegyzések megjelenítéséhez (sortörések megtartásával)
function formatBadgeNote(note) {
    if (!note) return '<span class="badge-note-empty">Nincs megjegyzés</span>';
    
    // Sortörések konvertálása <br> tag-ekre
    const formattedNote = note.replace(/\n/g, '<br>');
    return formattedNote;
}

// Kitűzők betöltése
async function loadBadges() {
    try {
        const { data: badges, error } = await supabase
            .from('badges')
            .select('*')
            .order('rank');

        if (error) throw error;

        // Tagok betöltése a számoláshoz
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('rank, name');

        if (membersError) throw membersError;

        // Rangok szerinti tagok számolása
        const rankCounts = {};
        if (members) {
            members.forEach(member => {
                rankCounts[member.rank] = (rankCounts[member.rank] || 0) + 1;
            });
        }

        renderBadges(badges || [], rankCounts);
    } catch (error) {
        console.error('Badges load error:', error);
        document.getElementById('badgeContainer').innerHTML = `
            <div class="empty-table-message">
                ❌ Hiba történt a kitűzők betöltésekor
            </div>
        `;
    }
}

// Kitűzők megjelenítése
function renderBadges(badges, rankCounts) {
    const container = document.getElementById('badgeContainer');
    
    if (!badges || badges.length === 0) {
        container.innerHTML = `
            <div class="empty-table-message">
                📝 Még nincsenek kitűzők<br>
                <small style="opacity: 0.7;">Adj hozzá megjegyzéseket a rangokhoz!</small>
            </div>
        `;
        return;
    }

    const rankHierarchy = {
        'Owner': { icon: '👑', order: 1 },
        'Co-Owner': { icon: '💎', order: 2 },
        'Manager': { icon: '💼', order: 3 },
        'Team Leader': { icon: '⭐', order: 4 },
        'Top Salesman': { icon: '🚀', order: 5 },
        'Sr. Salesman': { icon: '🔶', order: 6 },
        'Jr. Salesman': { icon: '🔹', order: 7 },
        'Towing Specialist': { icon: '🔧', order: 8 },
        'Tow Operator': { icon: '⚡', order: 9 },
        'Truck Driver': { icon: '🚛', order: 10 },
        'Member': { icon: '👤', order: 11 }
    };

    // Rendezés rang hierarchia szerint
    const sortedBadges = badges.sort((a, b) => {
        const orderA = rankHierarchy[a.rank]?.order || 99;
        const orderB = rankHierarchy[b.rank]?.order || 99;
        return orderA - orderB;
    });

    let html = '';
    
    sortedBadges.forEach(badge => {
        const rankInfo = rankHierarchy[badge.rank] || { icon: '👤', order: 99 };
        const memberCount = rankCounts[badge.rank] || 0;
        
        html += `
            <div class="badge-card">
                <div class="badge-rank-header">
                    <div class="badge-rank-icon">${rankInfo.icon}</div>
                    <div class="badge-rank-info">
                        <div class="badge-rank-name">${escapeHtml(badge.rank)}</div>
                        <div class="badge-members-count">${memberCount} tag</div>
                    </div>
                </div>
                
                <div class="badge-note-section">
                    <div class="badge-note-label">
                        📝 Megjegyzés
                        <span style="color: #667eea; font-size: 0.8em;">(Admin only)</span>
                    </div>
                    <div class="badge-note-content">
                        ${formatBadgeNote(badge.note)}
                    </div>
                </div>
                
                <div class="badge-actions">
                    <button class="badge-edit-btn" onclick="editBadgeNote('${escapeHtml(badge.rank).replace(/'/g, "\\'")}', '${escapeHtml(badge.note || '').replace(/'/g, "\\'")}')">
                        ✏️ Megjegyzés szerkesztése
                    </button>
                    ${badge.note ? `
                    <button class="badge-delete-btn" onclick="deleteBadgeNote('${escapeHtml(badge.rank).replace(/'/g, "\\'")}')">
                        ❌ Megjegyzés törlése
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Megjegyzés szerkesztése - CSAK ADMIN
function editBadgeNote(rank, currentNote) {
    if (!checkAdminAccess()) return;

    // Kitöltjük a formot a szerkesztéshez
    document.getElementById('badgeRankSelect').value = rank;
    document.getElementById('badgeNote').value = currentNote || '';

    // Görgetés a formhoz
    document.getElementById('badgeNote').focus();
}

// Új megjegyzés hozzáadása - CSAK ADMIN
async function addBadgeNote() {
    try {
        if (!checkAdminAccess()) return;

        const rank = document.getElementById('badgeRankSelect').value;
        const note = document.getElementById('badgeNote').value.trim();

        if (!rank) {
            showBadgeMessage('Válassz rangot!', 'warning');
            return;
        }

        if (!note) {
            showBadgeMessage('Írj megjegyzést!', 'warning');
            return;
        }

        // Ellenőrizzük, hogy létezik-e már a rang
        const { data: existingBadge, error: checkError } = await supabase
            .from('badges')
            .select('id')
            .eq('rank', rank)
            .single();

        let result;
        if (existingBadge) {
            // Frissítés
            result = await supabase
                .from('badges')
                .update({ 
                    note: note,
                    updated_by: currentUser.tagName,
                    updated_at: new Date().toISOString()
                })
                .eq('rank', rank);
        } else {
            // Új létrehozása
            result = await supabase
                .from('badges')
                .insert([{
                    rank: rank,
                    note: note,
                    created_by: currentUser.tagName
                }]);
        }

        if (result.error) throw result.error;

        showBadgeMessage('✅ Megjegyzés mentve!', 'success');
        document.getElementById('badgeNote').value = '';
        document.getElementById('badgeRankSelect').value = '';
        loadBadges();
        
    } catch (error) {
        console.error('addBadgeNote hiba:', error);
        showBadgeMessage('Hiba történt a mentés során', 'error');
    }
}

// Megjegyzés törlése - CSAK ADMIN
async function deleteBadgeNote(rank) {
    if (!checkAdminAccess()) return;
    
    const confirmDelete = confirm(`Biztosan törölni szeretnéd a(z) "${rank}" rang megjegyzését?`);
    
    if (!confirmDelete) return;
    
    try {
        const { error } = await supabase
            .from('badges')
            .delete()
            .eq('rank', rank);

        if (error) throw error;

        showBadgeMessage('✅ Megjegyzés törölve!', 'success');
        
        // Form reset
        document.getElementById('badgeRankSelect').value = '';
        document.getElementById('badgeNote').value = '';
        
        // Újratöltés
        loadBadges();
        
    } catch (error) {
        console.error('deleteBadgeNote hiba:', error);
        showBadgeMessage('Hiba történt a törlés során', 'error');
    }
}

// Kitűzők frissítése
async function refreshBadges() {
    try {
        await loadBadges();
        showBadgeMessage('✅ Kitűzők frissítve!', 'success');
    } catch (error) {
        console.error('refreshBadges hiba:', error);
        showBadgeMessage('Hiba történt a frissítés során', 'error');
    }
}

// Kitűző üzenetek
function showBadgeMessage(text, type = 'success') {
    const messageEl = document.getElementById('badgeMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

// === AUTÓ KÉPEK GALÉRIA FUNKCIÓK ===
// Galéria modell kereső funkciók
function showGalleryModelDropdown() {
    try {
        const dropdown = document.getElementById('galleryModelDropdown');
        if (!dropdown) return;
        
        const searchValue = document.getElementById('galleryModelSearch').value.toLowerCase();
        
        if (searchValue === '') {
            renderGalleryModelDropdown(modelOptions);
        } else {
            filterGalleryModels();
        }
        
        dropdown.style.display = 'block';
    } catch (error) {
        console.error('showGalleryModelDropdown hiba:', error);
    }
}

function filterGalleryModels() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        try {
            const searchValue = document.getElementById('galleryModelSearch').value.toLowerCase();
            const filteredModels = modelOptions.filter(model => 
                model.toLowerCase().includes(searchValue)
            );
            renderGalleryModelDropdown(filteredModels);
        } catch (error) {
            console.error('filterGalleryModels hiba:', error);
        }
    }, 300);
}

function renderGalleryModelDropdown(models) {
    try {
        const dropdown = document.getElementById('galleryModelDropdown');
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
            option.onclick = () => onGalleryModelSelected(model);
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('renderGalleryModelDropdown hiba:', error);
    }
}

function onGalleryModelSelected(model) {
    try {
        document.getElementById('galleryModelSearch').value = model;
        document.getElementById('galleryModelDropdown').style.display = 'none';
    } catch (error) {
        console.error('onGalleryModelSelected hiba:', error);
    }
}
// Galéria űrlap törlése
function clearGalleryForm() {
    document.getElementById('galleryModelSearch').value = ''; // MÓDOSÍTVA
    document.getElementById('galleryPrice').value = '';
    clearGalleryImage();
    showGalleryMessage('Űrlap törölve!', 'success');
}

// Új autó hozzáadása galériához
async function addGalleryCar() {
    try {
        if (!currentUser) {
            showGalleryMessage('Bejelentkezés szükséges!', 'warning');
            return;
        }

        const model = document.getElementById('galleryModelSearch').value.trim(); // MÓDOSÍTVA
        const price = document.getElementById('galleryPrice').value.replace(/[^\d]/g, '');

        if (!model) {
            showGalleryMessage('Válassz modellt a listából!', 'warning'); // MÓDOSÍTVA
            return;
        }

        if (!price) {
            showGalleryMessage('Add meg az árat!', 'warning');
            return;
        }

        if (!gallerySelectedImage) {
            showGalleryMessage('Kötelező képet feltölteni!', 'warning'); // MÓDOSÍTVA
            return;
        }

        // Autó adatok összeállítása
const carData = {
    model: model,
    sale_price: parseInt(price),
    added_by: currentUser.tagName,
    image_data_url: gallerySelectedImage.dataUrl,
    is_gallery: true, // Jelzés, hogy ez GALÉRIA autó
    sold: false
};

        console.log('📦 Autó adatok elküldése:', carData);

        const { data, error } = await supabase
            .from('cars')
            .insert([carData])
            .select();

        if (error) {
            console.error('❌ Galéria autó hozzáadás hiba:', error);
            showGalleryMessage('Hiba az autó hozzáadásában: ' + error.message, 'error');
        } else {
            console.log('✅ Galéria autó hozzáadva:', data);
            showGalleryMessage('Autó sikeresen hozzáadva a galériához!', 'success');
            clearGalleryForm();
            loadCarGallery();
        }

    } catch (error) {
        console.error('addGalleryCar hiba:', error);
        showGalleryMessage('Hiba történt az autó hozzáadása során', 'error');
    }
}

// Autó képek galéria betöltése
async function loadCarGallery() {
    try {
        // CSAK galéria autók betöltése
        const { data: cars, error } = await supabase
            .from('cars')
            .select('*')
            .eq('is_gallery', true) // CSAK a galéria autók
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        renderCarGallery(cars || []);
    } catch (error) {
        console.error('Car gallery load error:', error);
        const tbody = document.getElementById('galleryTableBody');
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: #e53e3e; padding: 20px;">
                    ❌ Hiba történt az autó képek betöltésekor
                </td>
            </tr>
        `;
    }
}
// Autó képek galéria megjelenítése
function renderCarGallery(cars) {
    const tbody = document.getElementById('galleryTableBody');
    
    if (!cars || cars.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-message">
                    🚗 Nincsenek megjeleníthető autók a galériában<br>
                    <small style="opacity: 0.7;">Adj hozzá egy új autót a fenti űrlappal!</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    
    cars.forEach(car => {
        const row = document.createElement('tr');
        
        // KÉP RÉSZ
        let imageHtml = '';
        let imageUrl = '';

        if (car.image_url && car.image_url.trim() !== '') {
            imageUrl = getImageUrl(car.image_url);
        } else if (car.image_data_url && car.image_data_url.trim() !== '') {
            imageUrl = car.image_data_url;
        }

        if (imageUrl && !imageUrl.includes('undefined')) {
    imageHtml = `
        <td class="image-cell">
            <img src="${imageUrl}" 
                 class="gallery-table-image" 
                 onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')"
                 alt="${escapeHtml(car.model || '')}">
        </td>
    `;
} else {
    imageHtml = `
        <td class="image-cell">
            <div class="gallery-no-image-small">
                👁️<br>Nincs
            </div>
        </td>
    `;
}
        
        // ÁR
        const ar = car.sale_price ? new Intl.NumberFormat('hu-HU').format(car.sale_price) + ' $' : '-';
        
        // MŰVELET GOMBOK
        let actionCell = '';
        if (currentUser) {
            const canDelete = (car.added_by === currentUser.tagName || currentUser.role === 'admin');
            
            if (canDelete) {
                actionCell = `
                    <td class="action-cell">
                        <div class="modern-action-buttons">
                            <button class="modern-btn-delete" onclick="deleteGalleryCar(${car.id})">❌ Törlés</button>
                        </div>
                    </td>
                `;
            } else {
                actionCell = '<td></td>';
            }
        } else {
            actionCell = '';
        }
        
        row.innerHTML = `
            ${imageHtml}
            <td style="font-weight: 600; color: #2d3748;">${escapeHtml(car.model || '')}</td>
            <td class="price-cell price-sale">${ar}</td>
            ${actionCell}
        `;
        
        tbody.appendChild(row);
    });
}

// Galéria autó törlése
async function deleteGalleryCar(carId) {
    try {
        if (!currentUser) {
            showGalleryMessage('Bejelentkezés szükséges!', 'warning');
            return;
        }

        const { data: car, error: carError } = await supabase
            .from('cars')
            .select('*')
            .eq('id', carId)
            .single();

        if (carError || !car) {
            showGalleryMessage('Autó nem található!', 'error');
            return;
        }

        if (car.added_by !== currentUser.tagName && currentUser.role !== 'admin') {
            showGalleryMessage('Csak a saját autódat törölheted!', 'error');
            return;
        }

        const { error } = await supabase
            .from('cars')
            .delete()
            .eq('id', carId);

        if (error) {
            showGalleryMessage('Hiba történt a törlés során: ' + error.message, 'error');
        } else {
            showGalleryMessage('Autó sikeresen törölve a galériából!', 'success');
            loadCarGallery();
        }
    } catch (error) {
        console.error('deleteGalleryCar hiba:', error);
        showGalleryMessage('Hiba történt a törlés során', 'error');
    }
}

// Galéria frissítése
async function refreshCarGallery() {
    try {
        await loadCarGallery();
        showGalleryMessage('✅ Galéria frissítve!', 'success');
    } catch (error) {
        console.error('refreshCarGallery hiba:', error);
        showGalleryMessage('Hiba történt a frissítés során', 'error');
    }
}

// Galéria üzenetek
function showGalleryMessage(text, type = 'success') {
    const messageEl = document.getElementById('galleryMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
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

function setupEnterKeyListener() {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin();
    });
    
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

async function handleLogin() {
  const loginButton = document.getElementById('loginButton');
  const originalText = loginButton.innerHTML;
  
  try {
    loginButton.innerHTML = '⏳ Bejelentkezés...';
    loginButton.classList.add('loading');
    loginButton.disabled = true;
    
    await login();
    
  } catch (error) {
    console.error('Login hiba:', error);
  } finally {
    loginButton.innerHTML = originalText;
    loginButton.classList.remove('loading');
    loginButton.disabled = false;
  }
}

// ===== OLDAL BETÖLTÉSE =====
// ===== OLDAL BETÖLTÉSE =====
window.onload = async () => {
    try {
        console.log('🔄 Oldal betöltése...');
        
        // Loading állapot bekapcsolása
        showLoadingState();
        
        // Először betöltjük a mentett bejelentkezést
        const savedUser = loadLoginState();
        if (savedUser) {
            console.log('✅ Automatikus bejelentkezés:', savedUser.tagName);
            currentUser = savedUser;
        }
        
        // UI frissítése
        updateUIForLoginState();
        
        // Adatok betöltése
        console.log('📦 Adatok betöltése...');
        await loadAllData();
        console.log('✅ Adatok betöltve');
        
        // Oldal megjelenítése
        const targetPage = loadCurrentPage();
        console.log('🎯 Céloldal:', targetPage);
        showPage(targetPage);
        
        // Loading állapot kikapcsolása
        hideLoadingState();
        
    } catch (error) {
        console.error('❌ Window load hiba:', error);
        showPage('autok');
        hideLoadingState();
    }
};

function showLoadingState() {
    // Egy egyszerű loading overlay
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'globalLoading';
    loadingDiv.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-size: 1.2em;
            color: #333;
        ">
            <div style="text-align: center;">
                <div style="font-size: 2em; margin-bottom: 10px;">⏳</div>
                <div>Adatok betöltése...</div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingDiv);
}

function hideLoadingState() {
    const loadingDiv = document.getElementById('globalLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// És a loadAllData függvényt is javítsuk, hogy tényleg várjon mindenre
async function loadAllData() {
  try {
    console.log('🔄 Összes adat betöltése...');
    
    // Párhuzamosan betöltjük az adatokat a teljesítmény érdekében
    await Promise.all([
      loadTuningOptions(),
      loadModelOptions(),
      loadTagOptions(),
      loadCars()
    ]);
    
    console.log('✅ Összes adat sikeresen betöltve');
  } catch (error) {
    console.error('❌ loadAllData hiba:', error);
    showMessage('Hiba történt az adatok betöltésekor', 'error');
    // Ne dobjunk hibát, hogy az oldal mégis megjelenhessen
  }
}

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
//galéria
document.addEventListener('click', function(event) {
    try {
        const modelDropdown = document.getElementById('modelDropdown');
        const modelSearch = document.getElementById('modelSearch');
        const galleryModelDropdown = document.getElementById('galleryModelDropdown');
        const galleryModelSearch = document.getElementById('galleryModelSearch');
        
        if (modelSearch && modelDropdown && !modelSearch.contains(event.target) && !modelDropdown.contains(event.target)) {
            modelDropdown.style.display = 'none';
        }
        
        // ÚJ: Galéria modell dropdown bezárása
        if (galleryModelSearch && galleryModelDropdown && !galleryModelSearch.contains(event.target) && !galleryModelDropdown.contains(event.target)) {
            galleryModelDropdown.style.display = 'none';
        }
    } catch (error) {
        console.error('Dropdown click handler hiba:', error);
    }
});

document.addEventListener('DOMContentLoaded', function() {
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.addEventListener('input', function() {
      formatInputPrice(this);
      updateProfitCalculator();
    });
  }
});

document.addEventListener('click', function(event) {
  const modal = document.getElementById('editSaleModal');
  if (event.target === modal) {
    closeEditModal();
  }
});

// Modal bezárás kattintásra
document.addEventListener('click', function(event) {
    const badgeModal = document.getElementById('badgeModal');
    if (event.target === badgeModal) {
        closeBadgeModal();
    }
    
    const kickedMembersModal = document.getElementById('kickedMembersModal');
    if (event.target === kickedMembersModal) {
        closeKickedMembersModal();
    }
});

window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  showMessage('Váratlan hiba történt', 'error');
});

// === FRISSÍTÉS FUNKCIÓ ===
async function refreshAllData() {
    try {
        console.log('🔄 Összes adat frissítése...');
        
        const refreshBtn = document.querySelector('.modern-btn-refresh');
        const originalText = refreshBtn.innerHTML;
        refreshBtn.innerHTML = '⏳ Frissítés...';
        refreshBtn.disabled = true;
        
        await loadAllData();
        
        if (document.getElementById('statisztikaPage').classList.contains('active')) {
            loadStats();
        }
        
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
        
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