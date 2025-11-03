// DEBUG: Ellenőrizzük, hogy a függvények elérhetőek-e
console.log('✅ modals.js betöltődött');

// Eladás modal bezárása
function closeEditModal() {
  console.log('🔒 closeEditModal meghívva');
  const modal = document.getElementById('editSaleModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('✅ Modal elrejtve');
  } else {
    console.error('❌ editSaleModal nem található');
  }
  currentCarIdForSale = null;
}

// Eladás modal megnyitása - JAVÍTOTT VERZIÓ
function openSoldModal(carId) {
  console.log('🚗 openSoldModal meghívva, carId:', carId);
  
  const car = allCars.find(c => c.id === carId);
  if (!car) {
    console.error('❌ Autó nem található:', carId);
    return;
  }

  currentCarIdForSale = carId;
  
  // Modal elem lekérése
  const modal = document.getElementById('editSaleModal');
  if (!modal) {
    console.error('❌ editSaleModal elem nem található');
    return;
  }
  
  // Kép beállítása
  const carImage = document.getElementById('editCarImage');
  if (carImage) {
    const imageUrl = getImageUrl(car.image_url || car.image_data_url);
    if (imageUrl && !imageUrl.includes('undefined')) {
      carImage.src = imageUrl;
      carImage.style.display = 'block';
      console.log('✅ Kép beállítva:', imageUrl);
    } else {
      carImage.style.display = 'none';
      console.log('ℹ️ Nincs kép');
    }
  }
  
  // Autó adatok
  const modelElement = document.getElementById('editCarModel');
  const purchasePriceElement = document.getElementById('editPurchasePrice');
  const currentPriceElement = document.getElementById('editCurrentPrice');
  
  if (modelElement) modelElement.textContent = car.Model || 'Ismeretlen modell';
  if (purchasePriceElement) purchasePriceElement.textContent = car.VetelArFormatted ? car.VetelArFormatted + ' $' : 'Nincs megadva';
  if (currentPriceElement) currentPriceElement.textContent = car.EladasiArFormatted ? car.EladasiArFormatted + ' $' : 'Nincs megadva';
  
  // Eladási ár input
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.value = car.EladasiArFormatted || '';
  }
  
  // Eladás típus alaphelyzetbe állítása
  const kpRadio = document.getElementById('saleTypeKp');
  const normalRadio = document.getElementById('saleTypeNormal');
  if (kpRadio) kpRadio.checked = true;
  if (normalRadio) normalRadio.checked = false;
  
  // Profit számoló frissítése
  updateProfitCalculator();
  
  // Modal megjelenítése - MÓDOSÍTOTT
  modal.style.display = 'block';
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
  
  console.log('✅ Modal megjelenítve');
  
  // Input fókusz
  setTimeout(() => {
    if (salePriceInput) {
      salePriceInput.focus();
      console.log('✅ Input fókusz beállítva');
    }
  }, 300);
}

// Profit számoló frissítése - MÓDOSÍTOTT
function updateProfitCalculator() {
  const salePriceInput = document.getElementById('editSalePrice').value.replace(/[^\d]/g, '');
  const salePrice = salePriceInput ? parseInt(salePriceInput) : 0;
  const saleType = document.querySelector('input[name="saleType"]:checked').value;
  
  const car = allCars.find(c => c.id === currentCarIdForSale);
  const purchasePrice = car.VetelAr || 0;
  
  const profitCalc = document.getElementById('profitCalc');
  
  if (salePrice > 0 && purchasePrice > 0) {
    // Adó számítás: normál eladás esetén 7.5% adó
    const taxRate = saleType === 'normal' ? 0.075 : 0;
    const taxAmount = Math.round(salePrice * taxRate);
    const netSalePrice = salePrice - taxAmount;
    const profit = netSalePrice - purchasePrice;
    
    const profitFormatted = new Intl.NumberFormat('hu-HU').format(Math.abs(profit));
    const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
    
    document.getElementById('calcPurchase').textContent = new Intl.NumberFormat('hu-HU').format(purchasePrice) + ' $';
    document.getElementById('calcSale').textContent = new Intl.NumberFormat('hu-HU').format(salePrice) + ' $';
    
    // Adó megjelenítése, ha van
    if (taxAmount > 0) {
      document.getElementById('calcTax').textContent = new Intl.NumberFormat('hu-HU').format(taxAmount) + ' $';
      document.getElementById('calcTax').style.display = 'block';
      document.getElementById('taxLabel').style.display = 'block';
      document.getElementById('calcNetSale').textContent = new Intl.NumberFormat('hu-HU').format(netSalePrice) + ' $';
      document.getElementById('calcNetSale').style.display = 'block';
      document.getElementById('netSaleLabel').style.display = 'block';
    } else {
      document.getElementById('calcTax').style.display = 'none';
      document.getElementById('taxLabel').style.display = 'none';
      document.getElementById('calcNetSale').style.display = 'none';
      document.getElementById('netSaleLabel').style.display = 'none';
    }
    
    document.getElementById('calcProfit').textContent = (profit >= 0 ? '+' : '-') + profitFormatted + ' $';
    document.getElementById('calcProfit').className = profitClass;
    
    profitCalc.style.display = 'block';
  } else {
    profitCalc.style.display = 'none';
  }
}

async function confirmSaleWithEdit() {
  if (!currentCarIdForSale || !currentUser) return;

  const salePriceInput = document.getElementById('editSalePrice').value.replace(/[^\d]/g, '');
  const salePriceValue = salePriceInput ? parseInt(salePriceInput) : null;
  const saleType = document.querySelector('input[name="saleType"]:checked').value;

  if (salePriceValue !== null && isNaN(salePriceValue)) {
    showMessage('Érvényes számot adj meg!', 'error');
    return;
  }

  const car = allCars.find(c => c.id === currentCarIdForSale);
  
  // Vételár ellenőrzése
  if (salePriceValue !== null && car.VetelAr && salePriceValue < car.VetelAr) {
    const confirmLoss = confirm(`⚠️ Figyelem! Az eladási ár (${new Intl.NumberFormat('hu-HU').format(salePriceValue)} $) alacsonyabb a vételárnál (${new Intl.NumberFormat('hu-HU').format(car.VetelAr)} $).\n\nBiztosan folytatod?`);
    if (!confirmLoss) return;
  }

  // Adó számítás
  const taxRate = saleType === 'normal' ? 0.075 : 0;
  const taxAmount = salePriceValue ? Math.round(salePriceValue * taxRate) : 0;
  const netSalePrice = salePriceValue ? salePriceValue - taxAmount : null;

  const { error } = await supabase
    .from('cars')
    .update({ 
      sold: true,
      sold_by: currentUser.tagName,
      sold_at: new Date().toISOString(),
      sale_price: salePriceValue,
      sale_type: saleType, // Eladás típus mentése
      tax_amount: taxAmount, // Adó összege
      net_sale_price: netSalePrice // Nettó eladási ár
    })
    .eq('id', currentCarIdForSale);

  if (error) {
    showMessage('Hiba: ' + error.message, 'error');
  } else {
    const priceInfo = salePriceValue ? ` (${new Intl.NumberFormat('hu-HU').format(salePriceValue)} $)` : '';
    const taxInfo = taxAmount > 0 ? ` - Adó: ${new Intl.NumberFormat('hu-HU').format(taxAmount)} $` : '';
    const saleTypeText = saleType === 'kp' ? 'Készpénz' : 'Normál';
    
    showMessage(`✅ Autó eladva${priceInfo}${taxInfo} (${saleTypeText} - Eladó: ${currentUser.tagName})`, 'success');
    await loadCars(true);
    loadStats();
  }

  closeEditModal();
}
// === JELSZÓVÁLTOZTATÁS FUNKCIÓK ===

// Jelszóváltoztatás modal megnyitása
function openChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal megnyitása...');
    console.log('currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('❌ Nincs bejelentkezve!');
        showMessage('Előbb jelentkezz be!', 'warning');
        return;
    }
    
    const modal = document.getElementById('changePasswordModal');
    console.log('Modal elem:', modal);
    
    if (!modal) {
        console.error('❌ changePasswordModal nem található!');
        showMessage('Hiba: a jelszóváltoztatás modal nem található', 'error');
        return;
    }
    
    modal.style.display = 'block';
    console.log('✅ Modal megjelenítve');
    
    // Mezők ürítése
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    // Üzenet elrejtése
    const messageEl = document.getElementById('changePasswordMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    setTimeout(() => {
        document.getElementById('currentPassword').focus();
    }, 300);
}

// Jelszóváltoztatás modal bezárása
function closeChangePasswordModal() {
    console.log('🔐 Jelszóváltoztatás modal bezárása');
    const modal = document.getElementById('changePasswordModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function changePassword() {
    try {
        if (!currentUser) {
            showChangePasswordMessage('Nincs bejelentkezve!', 'error');
            return;
        }
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            showChangePasswordMessage('Minden mező kitöltése kötelező!', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showChangePasswordMessage('Az új jelszavak nem egyeznek!', 'error');
            return;
        }
        
        if (newPassword.length < 4) {
            showChangePasswordMessage('Az új jelszó legalább 4 karakter hosszú legyen!', 'error');
            return;
        }
        
        // Jelenlegi jelszó ellenőrzése
        const { data: users, error: checkError } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', currentUser.username);
        
        if (checkError || !users || users.length === 0) {
            showChangePasswordMessage('Hiba történt az ellenőrzés során!', 'error');
            return;
        }
        
        const user = users[0];
        
        // Base64 ellenőrzés
        if (user.password_hash !== btoa(currentPassword)) {
            showChangePasswordMessage('A jelenlegi jelszó nem megfelelő!', 'error');
            return;
        }
        
        // Új jelszó hash-elése (base64)
        const newPasswordHash = btoa(newPassword);
        
        // Jelszó frissítése
        const { error: updateError } = await supabase
            .from('app_users')
            .update({ 
                password_hash: newPasswordHash
            })
            .eq('username', currentUser.username);
        
        if (updateError) {
            console.error('Jelszóváltoztatás hiba:', updateError);
            showChangePasswordMessage('Hiba történt a jelszó megváltoztatása során: ' + updateError.message, 'error');
        } else {
            showChangePasswordMessage('✅ Jelszó sikeresen megváltoztatva!', 'success');
            
            setTimeout(() => {
                closeChangePasswordModal();
                showMessage('Jelszó sikeresen megváltoztatva!', 'success');
            }, 2000);
        }
        
    } catch (error) {
        console.error('changePassword hiba:', error);
        showChangePasswordMessage('Váratlan hiba történt!', 'error');
    }
}

// Event listener-ek a modalokhoz
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Jelszóváltoztatás event listener-ek beállítása...');
    
    // Enter billentyű kezelése a jelszóváltoztatás modalban
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        console.log('✅ changePasswordModal elem megtalálva');
        const inputs = changePasswordModal.querySelectorAll('input[type="password"]');
        inputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter lenyomva a jelszóváltoztatásban');
                    changePassword();
                }
            });
        });
    } else {
        console.error('❌ changePasswordModal elem nem található!');
    }
    
    // Modal bezárás kattintásra
    document.addEventListener('click', function(event) {
        const editModal = document.getElementById('editSaleModal');
        if (event.target === editModal) {
            closeEditModal();
        }
        
        const changePasswordModal = document.getElementById('changePasswordModal');
        if (event.target === changePasswordModal) {
            console.log('📌 Modal bezárása kattintásra');
            closeChangePasswordModal();
        }
        
        const badgeModal = document.getElementById('badgeModal');
        if (event.target === badgeModal) {
            closeBadgeModal();
        }
        
        const kickedMembersModal = document.getElementById('kickedMembersModal');
        if (event.target === kickedMembersModal) {
            closeKickedMembersModal();
        }
    });
});

// Profit számoló input esemény
document.addEventListener('DOMContentLoaded', function() {
  const salePriceInput = document.getElementById('editSalePrice');
  if (salePriceInput) {
    salePriceInput.addEventListener('input', function() {
      formatInputPrice(this);
      updateProfitCalculator();
    });
  }
});

// ... meglévő kód ...

// Galéria ár módosítás modal event listener
document.addEventListener('click', function(event) {
    // ... meglévő kód ...
    
    const editGalleryPriceModal = document.getElementById('editGalleryPriceModal');
    if (event.target === editGalleryPriceModal) {
        closeEditGalleryPriceModal();
    }
});

// Galéria ár input formázása
document.addEventListener('DOMContentLoaded', function() {
  const galleryPriceInput = document.getElementById('editGalleryPrice');
  if (galleryPriceInput) {
    galleryPriceInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
});
// Event listener-ek a modalokhoz
document.addEventListener('click', function(event) {
    // ... meglévő kód ...
    
    const editTuningModal = document.getElementById('editTuningModal');
    if (event.target === editTuningModal) {
        closeEditTuningModal();
    }
});

// Tuning ár input formázása
document.addEventListener('DOMContentLoaded', function() {
  const tuningPPInput = document.getElementById('editTuningPPPrice');
  const tuningPriceInput = document.getElementById('editTuningPrice');
  
  if (tuningPPInput) {
    tuningPPInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
  
  if (tuningPriceInput) {
    tuningPriceInput.addEventListener('input', function() {
      formatInputPrice(this);
    });
  }
});

// Ár módosítás modal megnyitása
function openEditGalleryPriceModal(carId, currentBasePrice, currentSalePrice) {
  if (!currentUser) {
    showGalleryMessage('Bejelentkezés szükséges!', 'warning');
    return;
  }

  // Aktuális autó adatainak betöltése
  const car = allCars.find(c => c.id === carId) || {};
  
  // Modal tartalom feltöltése
  document.getElementById('editGalleryCarId').value = carId;
  document.getElementById('editGalleryCarModel').textContent = car.model || 'Ismeretlen modell';
  
  // Árak formázása
  const formattedBasePrice = currentBasePrice ? new Intl.NumberFormat('hu-HU').format(currentBasePrice) : '';
  const formattedSalePrice = currentSalePrice ? new Intl.NumberFormat('hu-HU').format(currentSalePrice) : '';
  
  document.getElementById('editGalleryBasePrice').value = formattedBasePrice;
  document.getElementById('editGalleryPrice').value = formattedSalePrice;
  
  // Modal megjelenítése
  document.getElementById('editGalleryPriceModal').style.display = 'block';
  
  // Input fókusz
  setTimeout(() => {
    document.getElementById('editGalleryBasePrice').focus();
  }, 300);
}

// Ár módosítás mentése
async function saveGalleryPrice() {
  try {
    const carId = document.getElementById('editGalleryCarId').value;
    const newBasePrice = document.getElementById('editGalleryBasePrice').value.replace(/[^\d]/g, '');
    const newSalePrice = document.getElementById('editGalleryPrice').value.replace(/[^\d]/g, '');
    
    if (!carId) {
      showGalleryMessage('Autó azonosító hiányzik!', 'error');
      return;
    }
    
    if (!newSalePrice) {
      showGalleryMessage('Add meg az eladási árat!', 'warning');
      return;
    }
    
    const salePriceValue = parseInt(newSalePrice);
    if (isNaN(salePriceValue) || salePriceValue <= 0) {
      showGalleryMessage('Érvényes eladási árat adj meg!', 'error');
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

    // Árak frissítése
    const updateData = {
      sale_price: salePriceValue,
      updated_at: new Date().toISOString()
    };

    // Csak akkor adjuk hozzá az alap árat, ha meg van adva
    if (newBasePrice) {
      updateData.base_price = parseInt(newBasePrice);
    } else {
      updateData.base_price = null;
    }

    const { error } = await supabase
      .from('cars')
      .update(updateData)
      .eq('id', carId);

    if (error) {
      showGalleryMessage('Hiba történt az ár módosítása során: ' + error.message, 'error');
    } else {
      showGalleryMessage('✅ Árak sikeresen módosítva!', 'success');
      closeEditGalleryPriceModal();
      loadCarGallery(); // Frissítjük a táblázatot
    }
    
  } catch (error) {
    console.error('saveGalleryPrice hiba:', error);
    showGalleryMessage('Hiba történt az ár módosítása során', 'error');
  }
}
// Galéria űrlap törlése
function clearGalleryForm() {
  document.getElementById('galleryModelSearch').value = '';
  document.getElementById('galleryBasePrice').value = '';
  document.getElementById('galleryPrice').value = '';
  clearGalleryImage();
}