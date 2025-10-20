// === TUNING KEZELÉSI FUNKCIÓK ===

// Tuningok betöltése
async function loadTunings() {
    try {
        const { data: tunings, error } = await supabase
            .from('tuning_options')
            .select('*')
            .order('name');

        if (error) throw error;
        
        renderTunings(tunings || []);
    } catch (error) {
        console.error('Tunings load error:', error);
        showTuningMessage('Hiba történt a tuningok betöltésekor', 'error');
    }
}

// Tuningok megjelenítése
function renderTunings(tunings) {
    const tbody = document.getElementById('tuningTableBody');
    
    if (!tunings || tunings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-table-message">
                    🔧 Nincsenek tuning csomagok<br>
                    <small style="opacity: 0.7;">Adj hozzá egy új tuning csomagot a fenti űrlappal!</small>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    
    tunings.forEach(tuning => {
        const row = document.createElement('tr');
        
        // Árak formázása - MEGCSERÉLVE: PP előbb, $ utána
        const ppAr = tuning.pp_price ? new Intl.NumberFormat('hu-HU').format(tuning.pp_price) + ' PP' : '-';
        const dollarAr = tuning.price ? new Intl.NumberFormat('hu-HU').format(tuning.price) + ' $' : '-';
        
        // MŰVELET GOMBOK - CSAK ADMINOKNAK
        let actionCell = '';
        if (currentUser && isAdmin()) {
            actionCell = `
                <td class="action-cell">
                    <div class="modern-action-buttons">
                        <button class="modern-btn-sold" onclick="openEditTuningModal(${tuning.id})">
                            ✏️ Ár módosítás
                        </button>
                        <button class="modern-btn-delete" onclick="deleteTuning(${tuning.id})">❌ Törlés</button>
                    </div>
                </td>
            `;
        } else {
            actionCell = '';
        }
        
        row.innerHTML = `
            <td style="font-weight: 600; color: #2d3748;">${escapeHtml(tuning.name || '')}</td>
            <td class="price-cell" style="color: #805ad5; font-weight: 700;">${ppAr}</td>
            <td class="price-cell price-sale">${dollarAr}</td>
            ${actionCell}
        `;
        
        tbody.appendChild(row);
    });
}

// Új tuning hozzáadása
async function addTuning() {
    try {
        if (!checkAdminAccess()) return;

        const name = document.getElementById('tuningName').value.trim();
        const price = document.getElementById('tuningPrice').value.replace(/[^\d]/g, '');
        const ppPrice = document.getElementById('tuningPPPrice').value.replace(/[^\d]/g, '');

        if (!name) {
            showTuningMessage('Add meg a tuning nevét!', 'warning');
            return;
        }

        // Legalább egy ár megadása kötelező
        if (!price && !ppPrice) {
            showTuningMessage('Add meg legalább egy árat ($ vagy PP)!', 'warning');
            return;
        }

        const tuningData = {
            name: name,
            price: price ? parseInt(price) : null,
            pp_price: ppPrice ? parseInt(ppPrice) : null,
            created_by: currentUser.tagName
        };

        const { data, error } = await supabase
            .from('tuning_options')
            .insert([tuningData])
            .select();

        if (error) {
            console.error('❌ Tuning hozzáadás hiba:', error);
            showTuningMessage('Hiba a tuning hozzáadásában: ' + error.message, 'error');
        } else {
            console.log('✅ Tuning hozzáadva:', data);
            showTuningMessage('Tuning csomag sikeresen hozzáadva!', 'success');
            clearTuningForm();
            loadTunings();
        }

    } catch (error) {
        console.error('addTuning hiba:', error);
        showTuningMessage('Hiba történt a tuning hozzáadása során', 'error');
    }
}

// Tuning törlése - CSAK ADMIN
async function deleteTuning(tuningId) {
    try {
        if (!checkAdminAccess()) return;

        const { error } = await supabase
            .from('tuning_options')
            .delete()
            .eq('id', tuningId);

        if (error) {
            showTuningMessage('Hiba történt a törlés során: ' + error.message, 'error');
        } else {
            showTuningMessage('Tuning csomag sikeresen törölve!', 'success');
            loadTunings();
        }
    } catch (error) {
        console.error('deleteTuning hiba:', error);
        showTuningMessage('Hiba történt a törlés során', 'error');
    }
}

// === TUNING ÁR MÓDOSÍTÁS FUNKCIÓK ===

// Tuning ár módosítás modal megnyitása
async function openEditTuningModal(tuningId) {
    try {
        if (!checkAdminAccess()) return;

        // Tuning adatainak betöltése
        const { data: tuning, error } = await supabase
            .from('tuning_options')
            .select('*')
            .eq('id', tuningId)
            .single();

        if (error || !tuning) {
            showTuningMessage('Tuning csomag nem található!', 'error');
            return;
        }

        // Modal tartalom feltöltése
        document.getElementById('editTuningId').value = tuningId;
        document.getElementById('editTuningName').textContent = tuning.name || 'Ismeretlen tuning';
        
        // Árak formázása
        const currentPP = tuning.pp_price ? new Intl.NumberFormat('hu-HU').format(tuning.pp_price) : '';
        const currentDollar = tuning.price ? new Intl.NumberFormat('hu-HU').format(tuning.price) : '';
        
        document.getElementById('editTuningPPPrice').value = currentPP;
        document.getElementById('editTuningPrice').value = currentDollar;

        // Modal megjelenítése
        document.getElementById('editTuningModal').style.display = 'block';
        
        // Input fókusz
        setTimeout(() => {
            document.getElementById('editTuningPPPrice').focus();
        }, 300);
        
    } catch (error) {
        console.error('openEditTuningModal hiba:', error);
        showTuningMessage('Hiba történt a tuning betöltése során', 'error');
    }
}

// Tuning ár módosítás modal bezárása
function closeEditTuningModal() {
    document.getElementById('editTuningModal').style.display = 'none';
}

// Tuning ár módosítás mentése
async function saveTuningPrice() {
    try {
        if (!checkAdminAccess()) return;

        const tuningId = document.getElementById('editTuningId').value;
        const newPPPrice = document.getElementById('editTuningPPPrice').value.replace(/[^\d]/g, '');
        const newPrice = document.getElementById('editTuningPrice').value.replace(/[^\d]/g, '');
        
        if (!tuningId) {
            showTuningMessage('Tuning azonosító hiányzik!', 'error');
            return;
        }
        
        // Legalább egy ár megadása kötelező
        if (!newPPPrice && !newPrice) {
            showTuningMessage('Add meg legalább egy árat ($ vagy PP)!', 'warning');
            return;
        }

        const updateData = {};
        // Csak az árakat frissítjük, nem kell updated_by és updated_at

        // Csak akkor adjuk hozzá az árat, ha meg van adva
        if (newPPPrice) {
            updateData.pp_price = parseInt(newPPPrice);
        } else {
            updateData.pp_price = null;
        }

        if (newPrice) {
            updateData.price = parseInt(newPrice);
        } else {
            updateData.price = null;
        }

        // Ár frissítése
        const { error } = await supabase
            .from('tuning_options')
            .update(updateData)
            .eq('id', tuningId);

        if (error) {
            showTuningMessage('Hiba történt az ár módosítása során: ' + error.message, 'error');
        } else {
            showTuningMessage('✅ Tuning árak sikeresen módosítva!', 'success');
            closeEditTuningModal();
            loadTunings(); // Frissítjük a táblázatot
        }
        
    } catch (error) {
        console.error('saveTuningPrice hiba:', error);
        showTuningMessage('Hiba történt az ár módosítása során', 'error');
    }
}