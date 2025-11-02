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
      
      saveLoginState(currentUser);
      updateUIForLoginState();
      
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
    
    clearLoginState();
    updateUIForLoginState();
    
    loadCars();
    loadTags();
    
    showPage('autok');
    showMessage('Sikeres kijelentkezés!', 'success');
  } catch (error) {
    console.error('❌ Logout hiba:', error);
  }
}

// === UI FRISSÍTÉS ===
function updateUIForLoginState() {
  console.log('🎨 UI frissítése, currentUser:', currentUser);
  
  const isLoggedIn = !!currentUser;
  const isAdminUser = isAdmin();
  
  const currentPage = localStorage.getItem('jimenezMotors_currentPage');
  if (currentPage) {
    if ((currentPage === 'statisztika' || currentPage === 'autokKepek') && !isLoggedIn) {
      console.log('🔄 Visszatérés az autók oldalra, mert a jelenlegi oldal nem elérhető');
      setTimeout(() => showPage('autok'), 100);
    }
  }
  
  console.log('✅ UI frissítve, logged-in:', isLoggedIn, 'admin:', isAdminUser);
  
  const adminFunctions = document.getElementById('adminFunctions');
  if (adminFunctions) {
    const displayMode = adminFunctions.classList.contains('admin-actions') ? 'flex' : 'block';
    adminFunctions.style.display = isLoggedIn ? displayMode : 'none';
  }
  
  const tagAdminFunctions = document.getElementById('tagAdminFunctions');
  if (tagAdminFunctions) tagAdminFunctions.style.display = isAdminUser ? 'block' : 'none';
  
  const passwordButtons = document.querySelectorAll('.password-btn');
  passwordButtons.forEach(btn => {
    btn.style.display = isLoggedIn ? 'inline-block' : 'none';
  });
  
  const tagAdminButton = document.getElementById('tagAdminButton');
  if (tagAdminButton) {
    tagAdminButton.style.display = isAdminUser ? 'flex' : 'none';
  }

  document.querySelectorAll('.login-btn').forEach(btn => {
    if (isLoggedIn) {
      btn.innerHTML = '🚪 Kijelentkezés (' + currentUser.tagName + ')';
      btn.onclick = logout;
    } else {
      btn.innerHTML = '🔐 Bejelentkezés';
      btn.onclick = () => showPage('login');
    }
  });

  const galleryAdminFunctions = document.getElementById('galleryAdminFunctions');
  if (galleryAdminFunctions) {
    galleryAdminFunctions.style.display = isLoggedIn ? 'block' : 'none';
  }
  
  const galleryActionHeader = document.getElementById('galleryActionHeader');
  if (galleryActionHeader) {
    galleryActionHeader.style.display = isLoggedIn ? 'table-cell' : 'none';
  }
  
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
  
  if (historyButton) {
    historyButton.style.display = isAdminUser ? 'flex' : 'none';
  }
  
  if (badgeButton) {
    badgeButton.style.display = isAdminUser ? 'flex' : 'none';
  }
  
  document.body.classList.toggle('logged-in', isLoggedIn);
  document.body.classList.toggle('admin', isAdminUser);
  
  updateStatisztikaButton();
  
  loadTags();
  
  const tuningAdminFunctions = document.getElementById('tuningAdminFunctions');
  if (tuningAdminFunctions) {
    tuningAdminFunctions.style.display = isAdminUser ? 'block' : 'none';
  }
  
  const tuningActionHeader = document.getElementById('tuningActionHeader');
  if (tuningActionHeader) {
    tuningActionHeader.style.display = isAdminUser ? 'table-cell' : 'none';
  }
  
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

// === MODERN LOGIN FUNKCIÓK ===
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