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
    const track = document.getElementById('carCardTrack');
    if (!track) return;

    track.innerHTML = '';

    if (!cars || cars.length === 0) {
      track.innerHTML = `
        <div class="car-card empty">
          <p>🚗 Jelenleg nincs eladó autó a listában.</p>
        </div>
      `;
      setupCarCarouselInteractions();
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

      const hasImage = imageUrl && !imageUrl.includes('undefined');

      const vetelAr = c.VetelArFormatted || '';
      const kivantAr = c.KivantArFormatted || '';
      const eladasiAr = c.EladasiArFormatted || '';

      let keszpenzAr = '';
      if (c.EladasiAr && !isNaN(c.EladasiAr)) {
        const keszpenzErtek = Math.round(c.EladasiAr * 0.925);
        keszpenzAr = new Intl.NumberFormat('hu-HU').format(keszpenzErtek);
      }

      let sellerInfo = '';
      if (c.Hozzáadta) {
        const eladoTag = tagOptions.find(tag => tag.name === c.Hozzáadta);
        const telefonszam = eladoTag?.phone || '';

        if (telefonszam) {
          const telHref = telefonszam.replace(/[^+\d]/g, '');
          sellerInfo = `
            <div class="seller-contact">
              <span class="seller-name">${escapeHtml(c.Hozzáadta)}</span>
              <a class="seller-phone" href="tel:${escapeHtml(telHref)}">${escapeHtml(telefonszam)}</a>
            </div>
          `;
        } else {
          sellerInfo = `
            <div class="seller-contact">
              <span class="seller-name">${escapeHtml(c.Hozzáadta)}</span>
              <span class="seller-phone muted">nincs telefonszám</span>
            </div>
          `;
        }
      } else {
        sellerInfo = `
          <div class="seller-contact">
            <span class="seller-name muted">Ismeretlen eladó</span>
          </div>
        `;
      }

      const adminButtons = [];
      if (currentUser) {
        adminButtons.push(`<button class="pill-btn" onclick="openSoldModal(${c.id})">Eladva</button>`);

        const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
        if (canDelete) {
          adminButtons.push(`<button class="pill-btn destructive" onclick="deleteCar(${c.id})">Törlés</button>`);
        }
      }

      const pricingRows = currentUser
        ? `
            <div class="price-row">
              <span class="price-label">Vételár</span>
              <span class="price-value">${vetelAr ? vetelAr + ' $' : '-'}</span>
            </div>
            <div class="price-row">
              <span class="price-label">Kívánt ár</span>
              <span class="price-value">${kivantAr ? kivantAr + ' $' : '-'}</span>
            </div>
          `
        : `
            <div class="price-row">
              <span class="price-label">Készpénz</span>
              <span class="price-value">${keszpenzAr ? keszpenzAr + ' $' : '-'}</span>
            </div>
          `;

      const statusBadge = `<span class="status-pill">Eladó</span>`;

      card.innerHTML = `
        <div class="car-media">
          ${hasImage
            ? `<img src="${imageUrl}" alt="${escapeHtml(c.Model || '')}" onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')">`
            : '<div class="car-media__placeholder">Nincs kép</div>'}
        </div>
        <div class="car-body">
          <div class="car-header">
            <h3>${escapeHtml(c.Model || '')}</h3>
            ${statusBadge}
          </div>
          <p class="car-tuning">${escapeHtml(c.Tuning || 'Nincs tuning megadva')}</p>
          <div class="price-block">
            <div class="price-row main">
              <span class="price-label">Eladási ár</span>
              <span class="price-value">${eladasiAr ? eladasiAr + ' $' : '-'}</span>
            </div>
            ${pricingRows}
          </div>
        </div>
        <div class="car-footer">
          ${sellerInfo}
          ${adminButtons.length ? `<div class="car-actions">${adminButtons.join('')}</div>` : ''}
        </div>
      `;

      track.appendChild(card);
    });
    setupCarCarouselInteractions();
  } catch (error) {
    console.error('renderCars hiba:', error);
    const track = document.getElementById('carCardTrack');
    if (track) {
      track.innerHTML = `
        <div class="car-card error">
          <p>❌ Hiba történt az autók betöltése során</p>
        </div>
      `;
    }
    setupCarCarouselInteractions();
  }
}

function setupCarCarouselInteractions() {
  const carousel = document.getElementById('carCarousel');
  if (!carousel) return;

  const controls = document.querySelectorAll('[data-carousel-control]');

  const updateButtons = () => {
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    const atStart = carousel.scrollLeft <= 2;
    const atEnd = carousel.scrollLeft >= maxScrollLeft - 2;

    controls.forEach(btn => {
      const direction = parseInt(btn.dataset.carouselControl || '0', 10);
      if (direction < 0) {
        btn.disabled = atStart;
        btn.classList.toggle('disabled', atStart);
      } else if (direction > 0) {
        btn.disabled = atEnd;
        btn.classList.toggle('disabled', atEnd);
      }
    });
  };

  if (!carousel.dataset.enhanced) {
    carousel.dataset.enhanced = 'true';

    let isPointerDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onPointerDown = (clientX) => {
      isPointerDown = true;
      startX = clientX;
      scrollLeft = carousel.scrollLeft;
      carousel.classList.add('is-dragging');
    };

    const onPointerMove = (clientX, event) => {
      if (!isPointerDown) return;
      event.preventDefault();
      const walk = clientX - startX;
      carousel.scrollLeft = scrollLeft - walk;
    };

    const stopPointer = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      carousel.classList.remove('is-dragging');
    };

    carousel.addEventListener('mousedown', (event) => {
      onPointerDown(event.pageX);
    });

    carousel.addEventListener('mousemove', (event) => {
      onPointerMove(event.pageX, event);
    });

    carousel.addEventListener('mouseleave', stopPointer);
    document.addEventListener('mouseup', stopPointer);

    carousel.addEventListener('touchstart', (event) => {
      if (!event.touches || !event.touches.length) return;
      onPointerDown(event.touches[0].pageX);
    }, { passive: true });

    carousel.addEventListener('touchmove', (event) => {
      if (!event.touches || !event.touches.length) return;
      onPointerMove(event.touches[0].pageX, event);
    }, { passive: false });

    carousel.addEventListener('touchend', stopPointer);
    carousel.addEventListener('touchcancel', stopPointer);

    controls.forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.addEventListener('click', () => {
        const direction = parseInt(btn.dataset.carouselControl || '0', 10);
        if (!direction) return;
        const offset = direction * Math.max(320, carousel.clientWidth * 0.8);
        carousel.scrollBy({ left: offset, behavior: 'smooth' });
      });
      btn.dataset.bound = 'true';
    });

    carousel.addEventListener('scroll', () => {
      window.requestAnimationFrame(updateButtons);
    });

    window.addEventListener('resize', updateButtons);
  }

  updateButtons();
}

document.addEventListener('DOMContentLoaded', setupCarCarouselInteractions);

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
      closeCarUploadModal();
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