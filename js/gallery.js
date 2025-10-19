// === GALÉRIA FUNKCIÓK ===
async function loadCarGallery() {
  try {
    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .eq('is_gallery', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    renderCarGallery(cars || []);
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

function renderCarGallery(cars) {
  const tbody = document.getElementById('galleryTableBody');
  
  if (!cars || cars.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table-message">
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
    
    // ÁR - szerkeszthető input mező
    const ar = car.sale_price ? new Intl.NumberFormat('hu-HU').format(car.sale_price) + ' $' : '-';
    
    // MŰVELET GOMBOK
    let actionCell = '';
    if (currentUser) {
      const canDelete = (car.added_by === currentUser.tagName || currentUser.role === 'admin');
      
      let buttonsHtml = '';
      
      // ÁR MÓDOSÍTÁS gomb
      buttonsHtml += `
        <button class="modern-btn-sold" onclick="openEditGalleryPriceModal(${car.id}, ${car.sale_price || 0})">
          ✏️ Ár módosítás
        </button>
      `;
      
      // TÖRLÉS gomb
      if (canDelete) {
        buttonsHtml += `<button class="modern-btn-delete" onclick="deleteGalleryCar(${car.id})">❌ Törlés</button>`;
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
    
    row.innerHTML = `
      ${imageHtml}
      <td style="font-weight: 600; color: #2d3748;">${escapeHtml(car.model || '')}</td>
      <td class="price-cell price-sale" id="price-${car.id}">${ar}</td>
      ${actionCell}
    `;
    
    tbody.appendChild(row);
  });
}

async function addGalleryCar() {
  try {
    if (!currentUser) {
      showGalleryMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    const model = document.getElementById('galleryModelSearch').value.trim();
    const price = document.getElementById('galleryPrice').value.replace(/[^\d]/g, '');

    if (!model) {
      showGalleryMessage('Válassz modellt a listából!', 'warning');
      return;
    }

    if (!price) {
      showGalleryMessage('Add meg az árat!', 'warning');
      return;
    }

    // KÉP NEM KÖTELEZŐ - csak ha van kiválasztva
    let imageDataUrl = null;
    if (gallerySelectedImage && gallerySelectedImage.dataUrl) {
      imageDataUrl = gallerySelectedImage.dataUrl;
    }

    const carData = {
      model: model,
      sale_price: parseInt(price),
      added_by: currentUser.tagName,
      image_data_url: imageDataUrl, // Ez lehet null is
      is_gallery: true,
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
      clearGalleryForm(); // Ez most nem jelenít meg üzenetet
      loadCarGallery();
    }

  } catch (error) {
    console.error('addGalleryCar hiba:', error);
    showGalleryMessage('Hiba történt az autó hozzáadása során', 'error');
  }
}


// ÚJ: Ár módosítás modal megnyitása
function openEditGalleryPriceModal(carId, currentPrice) {
  if (!currentUser) {
    showGalleryMessage('Bejelentkezés szükséges!', 'warning');
    return;
  }

  // Aktuális autó adatainak betöltése
  const car = allCars.find(c => c.id === carId) || {};
  
  // Modal tartalom feltöltése
  document.getElementById('editGalleryCarId').value = carId;
  document.getElementById('editGalleryCarModel').textContent = car.model || 'Ismeretlen modell';
  
  // Ár formázása
  const formattedPrice = currentPrice ? new Intl.NumberFormat('hu-HU').format(currentPrice) : '';
  document.getElementById('editGalleryPrice').value = formattedPrice;
  
  // Modal megjelenítése
  document.getElementById('editGalleryPriceModal').style.display = 'block';
  
  // Input fókusz
  setTimeout(() => {
    document.getElementById('editGalleryPrice').focus();
  }, 300);
}

// ÚJ: Ár módosítás modal bezárása
function closeEditGalleryPriceModal() {
  document.getElementById('editGalleryPriceModal').style.display = 'none';
}

// ÚJ: Ár módosítás mentése
async function saveGalleryPrice() {
  try {
    const carId = document.getElementById('editGalleryCarId').value;
    const newPrice = document.getElementById('editGalleryPrice').value.replace(/[^\d]/g, '');
    
    if (!carId) {
      showGalleryMessage('Autó azonosító hiányzik!', 'error');
      return;
    }
    
    if (!newPrice) {
      showGalleryMessage('Add meg az új árat!', 'warning');
      return;
    }
    
    const priceValue = parseInt(newPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      showGalleryMessage('Érvényes árat adj meg!', 'error');
      return;
    }

    // Ellenőrizzük, hogy a felhasználónak joga van módosítani
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
      showGalleryMessage('Csak a saját autódat módosíthatod!', 'error');
      return;
    }

    // Ár frissítése
    const { error } = await supabase
      .from('cars')
      .update({ 
        sale_price: priceValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', carId);

    if (error) {
      showGalleryMessage('Hiba történt az ár módosítása során: ' + error.message, 'error');
    } else {
      showGalleryMessage('✅ Ár sikeresen módosítva!', 'success');
      closeEditGalleryPriceModal();
      loadCarGallery(); // Frissítjük a táblázatot
    }
    
  } catch (error) {
    console.error('saveGalleryPrice hiba:', error);
    showGalleryMessage('Hiba történt az ár módosítása során', 'error');
  }
}

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

async function refreshCarGallery() {
  try {
    await loadCarGallery();
    showGalleryMessage('✅ Galéria frissítve!', 'success');
  } catch (error) {
    console.error('refreshCarGallery hiba:', error);
    showGalleryMessage('Hiba történt a frissítés során', 'error');
  }
}