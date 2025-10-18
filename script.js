// === SUPABASE KAPCSOLAT === 
const supabaseUrl = 'https://abpmluenermqghrrtjhq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicG1sdWVuZXJtcWdocnJ0amhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTYzMjgsImV4cCI6MjA3NjI5MjMyOH0.YkTZME_BB86r3mM8AyNYu-2yaMdh4LtDhHbynvdkaKA'; // 🔑 Itt add meg!
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let tuningOptions = [];
let modelOptions = [];
let tagOptions = [];
let allCars = [];
let currentUser = null;
let searchTimeout;
let selectedImage = null;

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
      data: e.target.result.split(',')[1],
      name: file.name,
      type: file.name.split('.').pop(),
      mimeType: file.type
    };
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
  const modal = document.createElement('div');
  modal.className = 'image-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <span class="close-modal" onclick="this.parentElement.style.display='none'">&times;</span>
    <img class="modal-content" src="${getImageUrl(imageUrl)}">
  `;
  document.body.appendChild(modal);

  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
      document.body.removeChild(modal);
    }
  };
}

function getImageUrl(imagePath) {
  if (!imagePath) return '';
  
  // Ha már teljes URL, használjuk azt
  if (imagePath.startsWith('http')) return imagePath;
  
  // Supabase storage URL összeállítása
  return `${supabaseUrl}/storage/v1/object/public/car-images/${imagePath}`;
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

function validateCarData(car) {
  const errors = [];
  
  if (!car.model || car.model.trim() === '') {
    errors.push('A modell megadása kötelező');
  }
  
  if (car.purchase_price && isNaN(parseInt(car.purchase_price))) {
    errors.push('A vételár érvényes szám legyen');
  }
  
  if (car.sale_price && isNaN(parseInt(car.sale_price))) {
    errors.push('Az eladási ár érvényes szám legyen');
  }
  
  if (car.purchase_price && car.sale_price) {
    const vetel = parseInt(car.purchase_price);
    const eladas = parseInt(car.sale_price);
    if (eladas < vetel) {
      errors.push('Az eladási ár nem lehet kisebb a vételárnál');
    }
  }
  
  return errors;
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

// ===== ALAP FUNKCIÓK =====
function showPage(pageName) {
  try {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(pageName + 'Page').classList.add('active');
    document.querySelector(`[onclick="showPage('${pageName}')"]`).classList.add('active');
    
    if (pageName === 'autok') loadCars();
    else if (pageName === 'tagok') loadTags();
    else if (pageName === 'statisztika') loadStats();
  } catch (error) {
    console.error('showPage hiba:', error);
    showMessage('Hiba történt az oldalváltás során', 'error');
  }
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

// ===== BEJELENTKEZÉS =====
async function login() {
  try {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      showLoginMessage('Írd be a felhasználónevet és jelszót!', 'warning');
      return;
    }

    const { data: users, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username);

    if (error || !users || users.length === 0) {
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
      
      document.getElementById('adminFunctions').style.display = 'block';
      document.getElementById('tagAdminFunctions').style.display = 'block';
      document.getElementById('kivantHeader').style.display = 'table-cell';
      document.getElementById('statusHeader').style.display = 'table-cell';
      document.getElementById('actionHeader').style.display = 'table-cell';
      document.getElementById('tagActionHeader').style.display = 'table-cell';
      
      document.querySelectorAll('.login-btn').forEach(btn => {
        btn.innerHTML = '🚪 Kijelentkezés (' + user.member_name + ')';
        btn.onclick = logout;
      });
      
      document.body.classList.add('logged-in');
      
      showPage('autok');
      showMessage('Sikeres bejelentkezés!', 'success');
    } else {
      showLoginMessage('Hibás jelszó!', 'error');
    }
  } catch (error) {
    console.error('Login hiba:', error);
    showLoginMessage('Hiba történt a bejelentkezés során', 'error');
  }
}

function logout() {
  try {
    currentUser = null;
    document.getElementById('adminFunctions').style.display = 'none';
    document.getElementById('tagAdminFunctions').style.display = 'none';
    document.getElementById('kivantHeader').style.display = 'none';
    document.getElementById('statusHeader').style.display = 'none';
    document.getElementById('actionHeader').style.display = 'none';
    document.getElementById('tagActionHeader').style.display = 'none';
    document.querySelectorAll('.login-btn').forEach(btn => {
      btn.innerHTML = '🔐 Bejelentkezés';
      btn.onclick = () => showPage('login');
    });
    
    document.body.classList.remove('logged-in');
    
    showPage('autok');
    showMessage('Sikeres kijelentkezés!', 'success');
  } catch (error) {
    console.error('Logout hiba:', error);
  }
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
    // Tuning opciók betöltése az adatbázisból
    const { data, error } = await supabase
      .from('tuning_options')
      .select('name')
      .order('name');

    if (error) throw error;
    
    // Ha vannak tuning opciók az adatbázisban, használjuk azokat
    if (data && data.length > 0) {
      tuningOptions = data.map(item => item.name);
    } else {
      // Ha nincsenek, használjuk a hardcode-olt listát
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
    // Fallback lista
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
      div.className = 'tuning-option';
      div.textContent = escapeHtml(optText);
      div.onclick = () => div.classList.toggle('selected');
      container.appendChild(div);
    });
  } catch (error) {
    console.error('renderTuningOptions hiba:', error);
  }
}

async function loadModelOptions() {
  try {
    // Modellek betöltése az adatbázisból
    const { data, error } = await supabase
      .from('car_models')
      .select('name, brand')
      .order('brand')
      .order('name');

    if (error) throw error;
    
    // Ha vannak modellek az adatbázisban, használjuk azokat
    if (data && data.length > 0) {
      modelOptions = data.map(item => item.name);
    } else {
      // Ha nincsenek, használjuk a hardcode-olt listát
      modelOptions = [
        'BMW M3', 'BMW M4', 'BMW M5', 'Mercedes C63 AMG', 'Mercedes E63 AMG',
        'Audi RS6', 'Audi RS7', 'Audi RS5', 'Porsche 911', 'Lamborghini Huracan'
      ];
    }
  } catch (error) {
    console.error('Model options load error:', error);
    // Fallback lista
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
      KepURL: getImageUrl(car.image_url)
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
    
    // Rang hierarchia definiálása - itt állíthatod a sorrendet
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
      // Új rangokat ide lehet hozzáadni
    };

    // Tagok rendezése: először rang szerint, majd név szerint
    const sortedTags = (data || []).sort((a, b) => {
      const rankOrderA = rankHierarchy[a.rank] || 99;
      const rankOrderB = rankHierarchy[b.rank] || 99;
      
      // Először rang szerint rendezés
      if (rankOrderA !== rankOrderB) {
        return rankOrderA - rankOrderB;
      }
      
      // Ha egyforma a rang, név szerint rendezés
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
      const colCount = currentUser ? 9 : 6;
      tbody.innerHTML = `<tr><td colspan="${colCount}">Nincs adat</td></tr>`;
      return;
    }
    
    cars.forEach(c => {
      const row = document.createElement('tr');
      
      const vetelAr = c.VetelArFormatted || c.VetelAr || '';
      const kivantAr = c.KivantArFormatted || c.KivantAr || '';
      const eladasiAr = c.EladasiArFormatted || c.EladasiAr || '';
      
let imageHtml = '';
let imageUrl = '';

// Először próbáljuk a Supabase storage-t
if (c.image_url && c.image_url.trim() !== '') {
  imageUrl = getImageUrl(c.image_url);
} 
// Ha nincs storage kép, próbáljuk a base64-t
else if (c.image_data_url && c.image_data_url.trim() !== '') {
  imageUrl = c.image_data_url;
}

if (imageUrl) {
  imageHtml = `
    <td>
      <img src="${imageUrl}" 
           class="car-image" 
           onclick="showImageModal('${imageUrl}')"
           alt="${escapeHtml(c.Model || '')}"
           onerror="this.onerror=null; this.src=''; this.parentNode.innerHTML='<div class=\\'no-image\\'>Hiba<br>kép</div>'">
    </td>
  `;
} else {
  imageHtml = `<td><div class="no-image">Nincs<br>kép</div></td>`;
}
      
      let rowHtml = `
        ${imageHtml}
        <td>${escapeHtml(c.Model || '')}</td>
        <td>${escapeHtml(c.Tuning || '')}</td>
      `;
      
      if (currentUser) {
        rowHtml += `<td>${vetelAr ? escapeHtml(vetelAr) + ' $' : ''}</td>`;
      } else {
        rowHtml += `<td class="hidden-price">*****</td>`;
      }
      
      if (currentUser) {
        rowHtml += `<td class="kivant-ar">${kivantAr ? escapeHtml(kivantAr) + ' $' : ''}</td>`;
      }
      
      rowHtml += `
        <td>${eladasiAr ? escapeHtml(eladasiAr) + ' $' : ''}</td>
        <td>${escapeHtml(c.Hozzáadta || '')}</td>
      `;
      
      if (currentUser) {
        const statusCell = c.Eladva ? 
          `<td><span style="color: green; font-weight: bold;">✅ ELADVA</span></td>` :
          `<td><span style="color: orange; font-weight: bold;">💰 ELADÓ</span></td>`;
        rowHtml += statusCell;
      }
      
      if (currentUser) {
        const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
        const canMarkSold = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
        
        let buttonsHtml = '';
        
        if (canDelete) {
          buttonsHtml += `<button class="btn-del" onclick="deleteCar(${c.id})">❌</button> `;
        }
        
        if (!c.Eladva && canMarkSold) {
          buttonsHtml += `<button class="btn-sold" onclick="markAsSold(${c.id})">💰</button>`;
        }
        
        rowHtml += `<td>${buttonsHtml}</td>`;
      }
      
      if (c.Eladva) {
        row.classList.add('sold-car');
      }
      
      row.innerHTML = rowHtml;
      tbody.appendChild(row);
    });
  } catch (error) {
    console.error('renderCars hiba:', error);
    showMessage('Hiba történt az autók megjelenítésekor', 'error');
  }
}

function renderTags(tags) {
  try {
    const tbody = document.getElementById('tagsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!tags || tags.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">Nincs tag</td></tr>';
      return;
    }
    
    tags.forEach(tag => {
      const row = document.createElement('tr');
      
      const rankIcon = getRankIcon(tag.rank);
      const rankDisplay = tag.rank ? `${rankIcon} ${escapeHtml(tag.rank)}` : 'Nincs rang';
      
      let actionCell = '';
      if (currentUser) {
        actionCell = `
          <td>
            <div class="action-buttons">
              ${currentUser.role === 'admin' ? `
                <select onchange="updateTagRank('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)" class="rank-select">
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
                <button class="btn-del" onclick="deleteTag('${escapeHtml(tag.name).replace(/'/g, "\\'")}')">❌</button>
              ` : ''}
            </div>
          </td>
        `;
      } else {
        actionCell = '<td></td>';
      }
      
      row.innerHTML = `
        <td>${escapeHtml(tag.name)}</td>
        <td>${rankDisplay}</td>
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
      dropdown.innerHTML = '<div class="model-option">Nincs találat</div>';
      return;
    }
    
    models.forEach(model => {
      const option = document.createElement('div');
      option.className = 'model-option';
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

// ===== MÓDOSÍTÓ FUNKCIÓK =====
async function addCar() {
  try {
    if (!currentUser) {
      showMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    const selectedModel = document.getElementById('modelSearch').value.trim();
    const selectedTuning = Array.from(document.querySelectorAll('.tuning-option.selected'))
      .map(div => div.textContent)
      .join(', ');

    if (!selectedModel) {
      showMessage('Válassz modellt!', 'warning');
      return;
    }

    const vetelAr = document.getElementById('vetel').value.replace(/[^\d]/g, '');
    const kivantAr = document.getElementById('kivant').value.replace(/[^\d]/g, '');
    const eladasiAr = document.getElementById('eladas').value.replace(/[^\d]/g, '');

    // KÉP KEZELÉS - BASE64 VAGY SUPABASE STORAGE
    let imagePath = null;
    let imageDataUrl = null;

    if (selectedImage) {
      // 1. PRÓBÁLJUK A SUPABASE STORAGE-T
      try {
        const fileName = `cars/${Date.now()}-${selectedImage.name}`;
        const blob = base64ToBlob(selectedImage.data, selectedImage.mimeType);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('car-images')
          .upload(fileName, blob);
        
        if (!uploadError) {
          imagePath = uploadData.path;
          console.log('✅ Kép feltöltve Supabase storage-ba:', imagePath);
        } else {
          console.warn('⚠️ Supabase storage hiba, base64-t használunk:', uploadError.message);
          // 2. FALLBACK: BASE64
          imageDataUrl = selectedImage.dataUrl;
        }
      } catch (storageError) {
        console.warn('⚠️ Storage hiba, base64 fallback:', storageError);
        imageDataUrl = selectedImage.dataUrl;
      }
    }

    const carData = {
      model: selectedModel,
      tuning: selectedTuning,
      purchase_price: vetelAr ? parseInt(vetelAr) : null,
      desired_price: kivantAr ? parseInt(kivantAr) : null,
      sale_price: eladasiAr ? parseInt(eladasiAr) : null,
      added_by: currentUser.tagName,
      sold: false,
      image_url: imagePath,        // Supabase storage útvonal
      image_data_url: imageDataUrl // Base64 kép adat
    };

    console.log('🚗 Autó adatok:', carData);

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
async function markAsSold(carId) {
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

    // MEGERŐSÍTÉS - csak ha még nincs eladva
    if (car.sold) {
      showMessage('Ez az autó már eladva!', 'warning');
      return;
    }

    // MEGERŐSÍTŐ ABLAK
    const confirmed = confirm(`Biztosan eladottá teszed ezt az autót?\n\nModell: ${car.model}\nEladó: ${currentUser.tagName}`);
    
    if (!confirmed) {
      return;
    }

    // AUTÓ FRISSÍTÉSE - hozzáadjuk, hogy ki adta el
    const { error } = await supabase
      .from('cars')
      .update({ 
        sold: true,
        sold_by: currentUser.tagName,  // Ki adta el
        sold_at: new Date().toISOString()  // Mikor adták el
      })
      .eq('id', carId);

    if (error) {
      showMessage('Hiba: ' + error.message, 'error');
    } else {
      showMessage(`✅ Autó eladva státuszba állítva! (Eladó: ${currentUser.tagName})`, 'success');
      loadCars();
      loadStats();
    }
  } catch (error) {
    console.error('markAsSold hiba:', error);
    showMessage('Hiba történt az eladott státusz beállítása során', 'error');
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
    document.querySelectorAll('.tuning-option').forEach(div => div.classList.remove('selected'));
    document.getElementById('modelDropdown').style.display = 'none';
    clearImage();
  } catch (error) {
    console.error('clearInputs hiba:', error);
  }
}

// Kattintás a dropdown-on kívül
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

// ===== OLDAL BETÖLTÉSE =====
window.onload = async () => {
  try {
    await loadAllData();
    showPage('autok');
  } catch (error) {
    console.error('Window load hiba:', error);
    showMessage('Hiba történt az oldal betöltésekor', 'error');
  }
};

// Global error handler
window.addEventListener('error', function(e) {
  console.error('Global error:', e.error);
  showMessage('Váratlan hiba történt', 'error');
});











