// === SEGÉDFÜGGVÉNYEK ===
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  
  if (!storageBaseUrl) {
    console.warn('⚠️ Nincs beállítva tárhely URL. Add meg a storageBaseUrl értékét a config.js fájlban.');
    return '';
  }

  const normalizedBase = storageBaseUrl.replace(/\/$/, '');
  const finalUrl = `${normalizedBase}/storage/v1/object/public/car-images/${imagePath}`;
  console.log('✅ Tárhely URL:', finalUrl);
  return finalUrl;
}

// Üzenet funkciók
function showMessage(text, type = 'success', elementId = 'message') {
  const messageEl = document.getElementById(elementId);
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
}

function showLoginMessage(text, type = 'success') {
  showMessage(text, type, 'loginMessage');
}

function showTagMessage(text, type = 'success') {
  showMessage(text, type, 'tagMessage');
}

function showTuningMessage(text, type = 'success') {
  showMessage(text, type, 'tuningMessage');
}

function showGalleryMessage(text, type = 'success') {
  showMessage(text, type, 'galleryMessage');
}

function showBadgeMessage(text, type = 'success') {
  showMessage(text, type, 'badgeMessage');
}

function showChangePasswordMessage(text, type = 'success') {
  showMessage(text, type, 'changePasswordMessage');
}

// Képkezelés
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

// Galéria kép kezelés
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

function clearGalleryImage() {
  document.getElementById('galleryCarImage').value = '';
  document.getElementById('galleryImageFileName').textContent = 'Nincs kép kiválasztva';
  document.getElementById('galleryImagePreview').innerHTML = '';
  gallerySelectedImage = null;
}

// Kép modal
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

// Model kereső funkciók
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

// Inputok törlése
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

// Galéria űrlap törlése
function clearGalleryForm() {
  document.getElementById('galleryModelSearch').value = '';
  document.getElementById('galleryPrice').value = '';
  clearGalleryImage();
  // ELTÁVOLÍTVA: showGalleryMessage('Űrlap törölve!', 'success');
}

// Tuning űrlap törlése
function clearTuningForm() {
  document.getElementById('tuningName').value = '';
  document.getElementById('tuningPrice').value = '';
  document.getElementById('tuningPPPrice').value = '';
}

// Loading állapotok
function showLoadingState() {
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

// Kitűző megjegyzés formázása
function formatBadgeNote(note) {
  if (!note) return '<span class="badge-note-empty">Nincs megjegyzés</span>';
  
  const formattedNote = note.replace(/\n/g, '<br>');
  return formattedNote;
}