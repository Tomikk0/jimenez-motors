// === AUTÓ KEZELÉSI FUNKCIÓK ===
async function loadCars() {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('is_gallery', false)
      .eq('sold', false)  // CSAK A NEM ELADOTT AUTÓK!
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
    
    console.log('🚗 Autók betöltve - Csak nem eladottak:', allCars.length, 'db');
    renderCars(allCars);
  } catch (error) {
    console.error('Cars load error:', error);
    showMessage('Hiba történt az autók betöltésekor', 'error');
  }
}

function renderCars(cars) {
  try {
    const container = document.getElementById('carCards');
    const emptyState = document.getElementById('carCardsEmpty');
    if (!container) return;

    container.innerHTML = '';

    if (!cars || cars.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    cars.forEach(c => {
      const card = document.createElement('article');
      card.className = 'car-card';

      let imageUrl = '';
      if (c.image_url && c.image_url.trim() !== '') {
        imageUrl = getImageUrl(c.image_url);
      } else if (c.image_data_url && c.image_data_url.trim() !== '') {
        imageUrl = c.image_data_url;
      }

      const hasValidImage = imageUrl && !imageUrl.includes('undefined');
      const imageSection = hasValidImage
        ? `<button type="button" class="car-card-image" onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')">
             <img src="${imageUrl}" alt="${escapeHtml(c.Model || '')}">
           </button>`
        : `<div class="car-card-image placeholder">
             <span>👁️<br>Nincs kép</span>
           </div>`;

      const vetelAr = c.VetelArFormatted ? `${c.VetelArFormatted} $` : '-';
      const kivantAr = c.KivantArFormatted ? `${c.KivantArFormatted} $` : '-';
      const eladasiAr = c.EladasiArFormatted ? `${c.EladasiArFormatted} $` : '-';

      let keszpenzAr = '-';
      if (c.EladasiAr && !isNaN(c.EladasiAr)) {
        const keszpenzErtek = Math.round(c.EladasiAr * 0.925);
        keszpenzAr = new Intl.NumberFormat('hu-HU').format(keszpenzErtek) + ' $';
      }

      let priceHtml = '';
      if (currentUser) {
        priceHtml = `
          <div class="car-card-price muted">
            <span class="label">Vételár</span>
            <span class="value">${vetelAr}</span>
          </div>
          <div class="car-card-price muted">
            <span class="label">Kívánt minimum ár</span>
            <span class="value">${kivantAr}</span>
          </div>
          <div class="car-card-price highlight">
            <span class="label">Eladási ár</span>
            <span class="value">${eladasiAr}</span>
          </div>
        `;
      } else {
        priceHtml = `
          <div class="car-card-price highlight">
            <span class="label">Eladási ár</span>
            <span class="value">${eladasiAr}</span>
          </div>
          <div class="car-card-price muted">
            <span class="label">Készpénzes ár</span>
            <span class="value">${keszpenzAr}</span>
          </div>
        `;
      }

      let sellerPhoneHtml = '';
      if (c.Hozzáadta) {
        const eladoTag = tagOptions.find(tag => tag.name === c.Hozzáadta);
        const telefonszam = eladoTag?.phone || '';
        if (telefonszam) {
          sellerPhoneHtml = `<div class="seller-phone">📞 ${escapeHtml(telefonszam)}</div>`;
        }
      }

      let actionHtml = '';
      if (currentUser) {
        const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
        let buttonsHtml = `<button class="modern-btn-sold" onclick="openSoldModal(${c.id})">Eladva</button>`;

        if (canDelete) {
          buttonsHtml += `<button class="modern-btn-delete" onclick="deleteCar(${c.id})">❌ Törlés</button>`;
        }

        actionHtml = `
          <div class="car-card-actions">
            ${buttonsHtml}
          </div>
        `;
      }

      card.innerHTML = `
        ${imageSection}
        <div class="car-card-body">
          <div class="car-card-header">
            <h4>${escapeHtml(c.Model || '')}</h4>
            <span class="status-badge status-available">💰 ELADÓ</span>
          </div>
          <p class="car-card-tuning">${escapeHtml(c.Tuning || '-')}</p>
          <div class="car-card-prices">
            ${priceHtml}
          </div>
          <div class="car-card-seller">
            <div class="seller-name">👤 ${escapeHtml(c.Hozzáadta || '-')}</div>
            ${sellerPhoneHtml || '<div class="seller-phone muted">nincs telefonszám</div>'}
          </div>
          ${actionHtml}
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('renderCars hiba:', error);
    const container = document.getElementById('carCards');
    const emptyState = document.getElementById('carCardsEmpty');
    if (container) {
      container.innerHTML = '<div class="car-card-error">❌ Hiba történt az autók betöltése során</div>';
    }
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }
}


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
      is_gallery: false
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
      if (typeof closeAddCarModal === 'function') {
        closeAddCarModal({ preserveForm: false });
      }
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
