// === ELADOTT AUTÓK FUNKCIÓK ===
async function loadSoldCars() {
  try {
    console.log('✅ Eladott autók betöltése...');
    
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('is_gallery', false)
      .eq('sold', true)
      .order('sold_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('📊 Eladott autók száma:', data?.length || 0);
    renderSoldCars(data || []);
    
  } catch (error) {
    console.error('Sold cars load error:', error);
    const message = document.getElementById('soldCarsMessage');
    if (message) {
      message.textContent = 'Hiba történt az eladott autók betöltésekor';
      message.className = 'message error';
      message.style.display = 'block';
    }
  }
}

function renderSoldCars(cars) {
  const tbody = document.getElementById('soldCarsTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!cars || cars.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table-message">
          ✅ Nincsenek eladott autók<br>
          <small style="opacity: 0.7;">Még nem adtál el egy autót sem!</small>
        </td>
      </tr>
    `;
    return;
  }
  
  cars.forEach(car => {
    const row = document.createElement('tr');
    row.classList.add('sold-row');
    
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
               class="modern-car-image" 
               onclick="showImageModal('${imageUrl.replace(/'/g, "\\'")}')"
               alt="${escapeHtml(car.model || '')}">
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
    
    // ÁRAK - MÓDOSÍTOTT: net_sale_price vagy sale_price megjelenítése
    const vetelAr = car.purchase_price ? new Intl.NumberFormat('hu-HU').format(car.purchase_price) + ' $' : '-';
    
    // Eladási ár megjelenítése - net_sale_price elsőbbsége
    let eladasiAr = '-';
    let eladasiArIkon = '';
    
    if (car.net_sale_price) {
      // Ha van nettó ár (adóval csökkentett)
      eladasiAr = new Intl.NumberFormat('hu-HU').format(car.net_sale_price) + ' $';
      eladasiArIkon = '🏪'; // Normál eladás ikon
    } else if (car.sale_price) {
      // Ha csak sima sale_price van (készpénz)
      eladasiAr = new Intl.NumberFormat('hu-HU').format(car.sale_price) + ' $';
      eladasiArIkon = '💵'; // Készpénz ikon
    }
    
    // PROFIT számolás - net_sale_price vagy sale_price alapján
    let profitHtml = '';
    if (car.purchase_price && (car.net_sale_price || car.sale_price)) {
      const netPrice = car.net_sale_price || car.sale_price;
      const profit = netPrice - car.purchase_price;
      const profitFormatted = new Intl.NumberFormat('hu-HU').format(Math.abs(profit));
      const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
      const profitIcon = profit >= 0 ? '📈' : '📉';
      
      profitHtml = `
        <td class="price-cell ${profitClass}">
          ${profitIcon} ${profit >= 0 ? '+' : '-'}${profitFormatted} $
        </td>
      `;
    } else {
      profitHtml = '<td class="price-cell price-hidden">-</td>';
    }
    
    // ELADTA ÉS HOZZÁADTA OSZLOP
    let eladtaCell = '';
    if (car.sold_by || car.added_by) {
      eladtaCell = `
        <td style="color: #4a5568;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <div style="font-weight: 700; color: #2d3748;">👤 Eladta</div>
              <div style="font-weight: 600; margin-top: 4px;">${escapeHtml(car.sold_by || '-')}</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #2d3748;">➕ Hozzáadta</div>
              <div style="font-weight: 600; margin-top: 4px;">${escapeHtml(car.added_by || '-')}</div>
            </div>
          </div>
        </td>
      `;
    } else {
      eladtaCell = `<td style="color: #4a5568;">-</td>`;
    }
    
    // ELADÁS DÁTUMA
    let soldDateHtml = '-';
    if (car.sold_at) {
      const soldDate = new Date(car.sold_at);
      soldDateHtml = soldDate.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    row.innerHTML = `
      ${imageHtml}
      <td style="font-weight: 600; color: #2d3748;">${escapeHtml(car.model || '')}</td>
      <td style="color: #718096; font-size: 0.9em;">${escapeHtml(car.tuning || '-')}</td>
      <td class="price-cell price-purchase">${vetelAr}</td>
      <td class="price-cell price-sale">
        ${eladasiArIkon} ${eladasiAr}
        ${car.tax_amount ? `<br><small style="color: #e53e3e; font-size: 0.8em;">Adó: ${new Intl.NumberFormat('hu-HU').format(car.tax_amount)} $</small>` : ''}
      </td>
      ${profitHtml}
      ${eladtaCell}
      <td style="color: #718096; font-size: 0.9em;">${soldDateHtml}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// Eladott autók frissítése
async function refreshSoldCars() {
  try {
    await loadSoldCars();
    const message = document.getElementById('soldCarsMessage');
    if (message) {
      message.textContent = '✅ Eladott autók frissítve!';
      message.className = 'message success';
      message.style.display = 'block';
      setTimeout(() => { message.style.display = 'none'; }, 3000);
    }
  } catch (error) {
    console.error('refreshSoldCars hiba:', error);
  }
}