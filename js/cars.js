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
    const tbody = document.getElementById('carTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!cars || cars.length === 0) {
      const colCount = currentUser ? 10 : 8; // Vissza az eredeti oszlopszám
      tbody.innerHTML = `
        <tr>
          <td colspan="${colCount}" class="empty-table-message">
            🚗 Nincsenek eladó autók<br>
          </td>
        </tr>
      `;
      return;
    }
    
    cars.forEach(c => {
      const row = document.createElement('tr');
      
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
        const keszpenzErtek = Math.round(c.EladasiAr * 0.925);
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
      
      // STÁTUSZ - MINDIG "ELADÓ", MIVEL CSAK ELADÓ AUTÓK VANNAK
      let statusCell = `
        <td>
          <span class="status-badge status-available">💰 ELADÓ</span>
        </td>
      `;
      
      // MŰVELET GOMBOK
      let actionCell = '';
      if (currentUser) {
        const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
        
        let buttonsHtml = '';
        
        // MINDIG MEGJELENIK AZ "ELADVA" GOMB, MIVEL MINDEN AUTÓ ELADÓ
        buttonsHtml += `<button class="modern-btn-sold" onclick="openSoldModal(${c.id})">Eladva</button>`;
        
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
      
      // Hozzáadta oszlop - NAGY TELEFONSZÁMMAL
      let hozzaadtaCell = '';
      if (c.Hozzáadta) {
        const eladoTag = tagOptions.find(tag => tag.name === c.Hozzáadta);
        const telefonszam = eladoTag?.phone || '';
        
        if (telefonszam) {
          hozzaadtaCell = `
            <td style="color: #4a5568;">
              <div style="font-weight: 600;">${escapeHtml(c.Hozzáadta)}</div>
              <div style="color: #4299e1; font-size: 1.3em; font-family: monospace; margin-top: 8px; font-weight: 700;">
                📞 ${escapeHtml(telefonszam)}
              </div>
            </td>
          `;
        } else {
          hozzaadtaCell = `
            <td style="color: #4a5568;">
              <div style="font-weight: 600;">${escapeHtml(c.Hozzáadta)}</div>
              <div style="color: #a0aec0; font-size: 0.9em; font-style: italic; margin-top: 4px;">
                nincs telefonszám
              </div>
            </td>
          `;
        }
      } else {
        hozzaadtaCell = `<td style="color: #4a5568;">-</td>`;
      }
      
      // SOR ÖSSZEÁLLÍTÁSA - STÁTUSZZAL
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
    const colCount = currentUser ? 10 : 8; // Vissza az eredeti oszlopszám
    tbody.innerHTML = `
      <tr>
        <td colspan="${colCount}" style="text-align: center; color: #e53e3e; padding: 20px;">
          ❌ Hiba történt az autók betöltése során
        </td>
      </tr>
    `;
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