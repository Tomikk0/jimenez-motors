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
        
        // Árak formázása
        const dollarAr = tuning.price ? new Intl.NumberFormat('hu-HU').format(tuning.price) + ' $' : '-';
        const ppAr = tuning.pp_price ? new Intl.NumberFormat('hu-HU').format(tuning.pp_price) + ' PP' : '-';
        
        // MŰVELET GOMBOK - CSAK ADMINOKNAK
        let actionCell = '';
        if (currentUser && isAdmin()) {
            actionCell = `
                <td class="action-cell">
                    <div class="modern-action-buttons">
                        <button class="modern-btn-delete" onclick="deleteTuning(${tuning.id})">❌ Törlés</button>
                    </div>
                </td>
            `;
        } else {
            actionCell = '';
        }
        
        row.innerHTML = `
            <td style="font-weight: 600; color: #2d3748;">${escapeHtml(tuning.name || '')}</td>
            <td class="price-cell price-sale">${dollarAr}</td>
            <td class="price-cell" style="color: #805ad5; font-weight: 700;">${ppAr}</td>
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