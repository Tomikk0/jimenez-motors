// === AUTÓ KEZELÉSI FUNKCIÓK ===
async function loadCars() {
  const grid = document.getElementById('carCardGrid');
  if (grid) {
    grid.innerHTML = `
      <article class="car-card car-card-empty">
        <div class="car-card-empty-icon">🚗</div>
        <div class="car-card-empty-text">Autók betöltése...</div>
      </article>
    `;
  }

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
    const grid = document.getElementById('carCardGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!cars || cars.length === 0) {
      grid.innerHTML = `
        <article class="car-card car-card-empty">
          <div class="car-card-empty-icon">🚗</div>
          <div class="car-card-empty-text">Nincsenek eladó autók</div>
        </article>
      `;
      return;
    }

    cars.forEach(c => {
      const card = document.createElement('article');
      card.className = 'car-card';

      let imageUrl = '';
      if (c.image_url && c.image_url.trim() !== '') {
        imageUrl = getImageUrl(c.image_url);
      } else if (c.image_data_url && c.image_data_url.trim() !== '') {
        imageUrl = c.image_data_url;
      }

      const safeModel = escapeHtml(c.Model || '');
      const safeTuning = escapeHtml(c.Tuning || '-');

      const vetelAr = c.VetelArFormatted ? `${c.VetelArFormatted} $` : '-';
      const kivantAr = c.KivantArFormatted ? `${c.KivantArFormatted} $` : '-';
      const eladasiAr = c.EladasiArFormatted ? `${c.EladasiArFormatted} $` : '-';

      let keszpenzAr = '-';
      if (c.EladasiAr && !isNaN(c.EladasiAr)) {
        const keszpenzErtek = Math.round(c.EladasiAr * 0.925);
        keszpenzAr = `${new Intl.NumberFormat('hu-HU').format(keszpenzErtek)} $`;
      }

      let sellerNameHtml = '<span class="car-card-meta-value">-</span>';
      let sellerPhoneHtml = '<span class="car-card-meta-subtle">nincs adat</span>';
      if (c.Hozzáadta) {
        const sellerName = escapeHtml(c.Hozzáadta);
        const eladoTag = tagOptions.find(tag => tag.name === c.Hozzáadta);
        const telefonszam = eladoTag && eladoTag.phone ? escapeHtml(eladoTag.phone) : '';
        sellerNameHtml = `<span class="car-card-meta-value">${sellerName}</span>`;
        sellerPhoneHtml = telefonszam
          ? `<span class="car-card-meta-phone">📞 ${telefonszam}</span>`
          : '<span class="car-card-meta-subtle">nincs telefonszám</span>';
      }

      const canDelete = currentUser && (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');

      const imageSection = imageUrl && !imageUrl.includes('undefined')
        ? `<button class="car-card-image-button" type="button" onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')">
             <img src="${imageUrl}" alt="${safeModel}" class="car-card-image">
           </button>`
        : `<div class="car-card-image car-card-image--empty">
             <span>👁️</span>
             <small>Nincs kép</small>
           </div>`;

      const actionSection = currentUser
        ? `<div class="car-card-actions">
             <button class="modern-btn-sold" onclick="openSoldModal(${c.id})">Eladva</button>
             ${canDelete ? `<button class="modern-btn-delete" onclick="deleteCar(${c.id})">❌ Törlés</button>` : ''}
           </div>`
        : '';

      card.innerHTML = `
        <div class="car-card-status">💰 ELADÓ</div>
        <div class="car-card-visual">${imageSection}</div>
        <div class="car-card-content">
          <header class="car-card-header">
            <h4 class="car-card-title">${safeModel}</h4>
            <p class="car-card-subtitle">${safeTuning}</p>
          </header>
          <section class="car-card-prices">
            <div class="car-card-price car-card-price-sale">
              <span class="car-card-price-label">Eladási ár</span>
              <span class="car-card-price-value">${eladasiAr}</span>
            </div>
            <div class="car-card-price car-card-price-public car-card-price-keszpenz">
              <span class="car-card-price-label">Készpénzes ár</span>
              <span class="car-card-price-value">${keszpenzAr}</span>
            </div>
            <div class="car-card-price car-card-price-private">
              <span class="car-card-price-label">Vételár</span>
              <span class="car-card-price-value">${vetelAr}</span>
            </div>
            <div class="car-card-price car-card-price-private">
              <span class="car-card-price-label">Kívánt minimum ár</span>
              <span class="car-card-price-value">${kivantAr}</span>
            </div>
          </section>
          <section class="car-card-meta">
            <div class="car-card-meta-row">
              <span class="car-card-meta-label">Eladó</span>
              ${sellerNameHtml}
            </div>
            <div class="car-card-meta-row">
              <span class="car-card-meta-label">Kapcsolat</span>
              ${sellerPhoneHtml}
            </div>
          </section>
        </div>
        ${actionSection}
      `;

      grid.appendChild(card);
    });
  } catch (error) {
    console.error('renderCars hiba:', error);
    const grid = document.getElementById('carCardGrid');
    if (grid) {
      grid.innerHTML = `
        <article class="car-card car-card-empty car-card-error">
          <div class="car-card-empty-icon">❌</div>
          <div class="car-card-empty-text">Hiba történt az autók betöltése során</div>
        </article>
      `;
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
