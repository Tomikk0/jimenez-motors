// === AUTÓ KEZELÉSI FUNKCIÓK ===
const currencyFormatterHU = new Intl.NumberFormat('hu-HU');
let addCarModalEscHandler = null;

function buildCarDisplayData(car, hasTagMap) {
  const display = {
    safeModel: escapeHtml(car.Model || ''),
    safeTuning: escapeHtml(car.Tuning || '-'),
    vetelAr: car.VetelArFormatted ? `${car.VetelArFormatted} $` : '-',
    kivantAr: car.KivantArFormatted ? `${car.KivantArFormatted} $` : '-',
    eladasiAr: car.EladasiArFormatted ? `${car.EladasiArFormatted} $` : '-',
    keszpenzAr: '-',
    sellerNameHtml: '<span class="car-card-meta-value">-</span>',
    sellerPhoneHtml: '<span class="car-card-meta-subtle">nincs adat</span>',
    sellerNameDisplay: '-',
    sellerPhoneDisplay: 'nincs adat',
    imageUrl: '',
    hasImage: false
  };

  if (car.EladasiAr && !isNaN(car.EladasiAr)) {
    const keszpenzErtek = Math.round(car.EladasiAr * 0.925);
    display.keszpenzAr = `${currencyFormatterHU.format(keszpenzErtek)} $`;
  }

  let imageUrl = '';
  if (car.KepURL && car.KepURL.trim() !== '') {
    imageUrl = car.KepURL;
  } else if (car.image_data_url && car.image_data_url.trim() !== '') {
    imageUrl = car.image_data_url;
  }

  if (imageUrl) {
    display.imageUrl = imageUrl;
    display.hasImage = true;
  }

  if (car.Hozzáadta) {
    const sellerName = escapeHtml(car.Hozzáadta);
    let telefonszam = '';

    if (hasTagMap) {
      const eladoTag = tagOptionMap.get(car.Hozzáadta) || null;
      telefonszam = eladoTag && eladoTag.phone ? escapeHtml(eladoTag.phone) : '';
    } else if (Array.isArray(tagOptions) && tagOptions.length > 0) {
      const fallbackTag = tagOptions.find(tag => tag.name === car.Hozzáadta);
      telefonszam = fallbackTag && fallbackTag.phone ? escapeHtml(fallbackTag.phone) : '';
    }

    display.sellerNameHtml = `<span class="car-card-meta-value">${sellerName}</span>`;
    display.sellerNameDisplay = sellerName;

    if (telefonszam) {
      display.sellerPhoneHtml = `<span class="car-card-meta-phone">📞 ${telefonszam}</span>`;
      display.sellerPhoneDisplay = telefonszam;
    }
  }

  return display;
}

function createCarCardElement(car, display, showActions, canDelete) {
  const card = document.createElement('article');
  card.className = 'car-card';

  const imageSection = display.hasImage
    ? `<button class="car-card-image-button" type="button" onclick="showImageModal('${display.imageUrl.replace(/'/g, "\\'")}')">
         <img src="${display.imageUrl}" alt="${display.safeModel}" class="car-card-image">
       </button>`
    : `<div class="car-card-image car-card-image--empty">
         <span>👁️</span>
         <small>Nincs kép</small>
       </div>`;

  const actionSection = showActions
    ? `<div class="car-card-actions">
         <button class="modern-btn-sold" onclick="openSoldModal(${car.id})">Eladva</button>
         ${canDelete ? `<button class="modern-btn-delete" onclick="deleteCar(${car.id})">❌ Törlés</button>` : ''}
       </div>`
    : '';

  card.innerHTML = `
    <div class="car-card-status">💰 ELADÓ</div>
    <div class="car-card-visual">${imageSection}</div>
    <div class="car-card-content">
      <header class="car-card-header">
        <h4 class="car-card-title">${display.safeModel}</h4>
        <p class="car-card-subtitle">${display.safeTuning}</p>
      </header>
      <section class="car-card-prices">
        <div class="car-card-price car-card-price-sale">
          <span class="car-card-price-label">Eladási ár</span>
          <span class="car-card-price-value">${display.eladasiAr}</span>
        </div>
        <div class="car-card-price car-card-price-public car-card-price-keszpenz">
          <span class="car-card-price-label">Készpénzes ár</span>
          <span class="car-card-price-value">${display.keszpenzAr}</span>
        </div>
        <div class="car-card-price car-card-price-private">
          <span class="car-card-price-label">Vételár</span>
          <span class="car-card-price-value">${display.vetelAr}</span>
        </div>
        <div class="car-card-price car-card-price-private">
          <span class="car-card-price-label">Kívánt minimum ár</span>
          <span class="car-card-price-value">${display.kivantAr}</span>
        </div>
      </section>
      <section class="car-card-meta">
        <div class="car-card-meta-row">
          <span class="car-card-meta-label">Eladó</span>
          ${display.sellerNameHtml}
        </div>
        <div class="car-card-meta-row">
          <span class="car-card-meta-label">Kapcsolat</span>
          ${display.sellerPhoneHtml}
        </div>
      </section>
    </div>
    ${actionSection}
  `;

  return card;
}

function openAddCarModal() {
  try {
    if (!currentUser) {
      showMessage('Bejelentkezés szükséges!', 'warning');
      return;
    }

    clearInputs();

    const modal = document.getElementById('addCarModal');
    if (!modal) return;

    modal.style.display = 'block';
    modal.classList.add('active');

    setTimeout(() => {
      const input = document.getElementById('modelSearch');
      if (input) {
        input.focus();
      }
    }, 150);

    if (!addCarModalEscHandler) {
      addCarModalEscHandler = (event) => {
        if (event.key === 'Escape') {
          closeAddCarModal();
        }
      };
    }

    document.addEventListener('keydown', addCarModalEscHandler);
  } catch (error) {
    console.error('openAddCarModal hiba:', error);
  }
}

function closeAddCarModal() {
  try {
    const modal = document.getElementById('addCarModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';

    if (addCarModalEscHandler) {
      document.removeEventListener('keydown', addCarModalEscHandler);
      addCarModalEscHandler = null;
    }
  } catch (error) {
    console.error('closeAddCarModal hiba:', error);
  }
}

function transformCarRow(car) {
  if (!car || typeof car !== 'object') {
    return null;
  }

  const formattedPurchase = car.purchase_price ? currencyFormatterHU.format(car.purchase_price) : '';
  const formattedDesired = car.desired_price ? currencyFormatterHU.format(car.desired_price) : '';
  const formattedSale = car.sale_price ? currencyFormatterHU.format(car.sale_price) : '';
  const preparedImageUrl = car.image_url ? getImageUrl(car.image_url) : (car.image_data_url || '');

  return {
    ...car,
    VetelArFormatted: formattedPurchase,
    KivantArFormatted: formattedDesired,
    EladasiArFormatted: formattedSale,
    Model: car.model,
    Tuning: car.tuning,
    VetelAr: car.purchase_price,
    KivantAr: car.desired_price,
    EladasiAr: car.sale_price,
    Eladva: car.sold,
    Hozzáadta: car.added_by,
    KepURL: preparedImageUrl,
    sold_by: car.sold_by,
    sold_at: car.sold_at
  };
}

function setCars(rows) {
  const validRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const prepared = validRows.map(transformCarRow).filter(Boolean);

  allCars = prepared;
  carsLoaded = true;
  carsLoadingPromise = null;

  console.log('🚗 Autó lista frissítve:', prepared.length, 'db');
  renderCars(allCars);

  return prepared;
}

async function loadCars(force = false) {
  const grid = document.getElementById('carCardGrid');

  if (!force) {
    if (carsLoadingPromise) {
      return carsLoadingPromise;
    }

    if (carsLoaded) {
      renderCars(allCars);
      return Promise.resolve(allCars);
    }
  } else {
    carsLoaded = false;
  }

  if (grid) {
    grid.innerHTML = `
      <article class="car-card car-card-empty">
        <div class="car-card-empty-icon">🚗</div>
        <div class="car-card-empty-text">Autók betöltése...</div>
      </article>
    `;
  }

  const fetchPromise = (async () => {
    const { data, error } = await supabase
      .from('cars')
      .select('id, model, tuning, purchase_price, desired_price, sale_price, sold, added_by, image_url, image_data_url, sold_by, sold_at, created_at')
      .eq('is_gallery', false)
      .eq('sold', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = Array.isArray(data) ? data : [];
    const prepared = setCars(rows);
    console.log('🚗 Autók betöltve - Csak nem eladottak:', prepared.length, 'db');
    return prepared;
  })();

  const handledPromise = fetchPromise.catch(error => {
    carsLoaded = false;
    console.error('Cars load error:', error);
    showMessage('Hiba történt az autók betöltésekor', 'error');
    throw error;
  }).finally(() => {
    carsLoadingPromise = null;
  });

  carsLoadingPromise = handledPromise;

  return handledPromise;
}

function renderCars(cars) {
  try {
    const grid = document.getElementById('carCardGrid');
    if (!grid) return;

    if (!cars || cars.length === 0) {
      grid.innerHTML = `
        <article class="car-card car-card-empty">
          <div class="car-card-empty-icon">🚗</div>
          <div class="car-card-empty-text">Nincsenek eladó autók</div>
        </article>
      `;
      return;
    }

    const showActions = Boolean(currentUser);
    const hasTagMap = typeof tagOptionMap !== 'undefined' && tagOptionMap instanceof Map && tagOptionMap.size > 0;
    const countByModel = new Map();

    cars.forEach(car => {
      const key = (car.Model || '').trim().toLowerCase();
      if (!key) {
        return;
      }
      countByModel.set(key, (countByModel.get(key) || 0) + 1);
    });

    const multipleEntries = [];
    const singleEntries = [];

    cars.forEach(car => {
      const display = buildCarDisplayData(car, hasTagMap);
      const key = (car.Model || '').trim().toLowerCase();
      const entry = {
        car,
        display,
        canDelete: showActions && (car.Hozzáadta === currentUser?.tagName || currentUser?.role === 'admin')
      };

      if (key && (countByModel.get(key) || 0) > 1) {
        multipleEntries.push(entry);
      } else {
        singleEntries.push(entry);
      }
    });

    const fragment = document.createDocumentFragment();

    if (multipleEntries.length > 0) {
      const multiStrip = document.createElement('div');
      multiStrip.className = 'car-card-strip car-card-strip-primary';
      multipleEntries.forEach(({ car, display, canDelete }) => {
        multiStrip.appendChild(createCarCardElement(car, display, showActions, canDelete));
      });
      fragment.appendChild(multiStrip);
    }

    if (singleEntries.length > 0) {
      const miscSection = document.createElement('section');
      miscSection.className = 'car-card-section car-card-section-misc';

      const heading = document.createElement('div');
      heading.className = 'car-card-section-title';
      heading.textContent = 'Egyéb';
      miscSection.appendChild(heading);

      const miscStrip = document.createElement('div');
      miscStrip.className = 'car-card-strip car-card-strip-misc';
      singleEntries.forEach(({ car, display, canDelete }) => {
        miscStrip.appendChild(createCarCardElement(car, display, showActions, canDelete));
      });
      miscSection.appendChild(miscStrip);

      fragment.appendChild(miscSection);
    }

    grid.innerHTML = '';
    grid.appendChild(fragment);
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
      .map(div => div.dataset.value || div.textContent)
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
      closeAddCarModal();
      await loadCars(true);
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
      await loadCars(true);
      loadStats();
    }
  } catch (error) {
    console.error('deleteCar hiba:', error);
    showMessage('Hiba történt a törlés során', 'error');
  }
}