let currentPasswordChangeMember = null;
let currentPhoneEditMember = null;
let currentPhoneEditValue = '';
async function forceRefreshTagAdmin() {
    console.log('🔄 Kényszerített frissítés...');
    try {
        await loadTagAdminData();
        showTagAdminMessage('✅ Lista manuálisan frissítve!', 'success');
    } catch (error) {
        console.error('❌ Kényszerített frissítés hiba:', error);
        showTagAdminMessage('Hiba a frissítés során', 'error');
    }
}
// Hiányzó függvények hozzáadása

// Véletlen jelszó generálás
function generateRandomPassword(length = 8) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Tag Admin üzenetek
function showTagAdminMessage(text, type = 'success') {
    showMessage(text, type, 'tagAdminMessage');
}

// Felhasználónév generálás
function generateUsername(tagName) {
    // Eltávolítjuk a speciális karaktereket és szóközöket
    const cleanName = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/\s+/g, '');
    
    // Hozzáadunk egy véletlen számot a végére
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}${randomNum}`;
}

// Jelszó generálás opció váltása
function togglePasswordOption() {
    try {
        const generatePassword = document.getElementById('generatePassword');
        const customPasswordContainer = document.getElementById('customPasswordContainer');
        
        if (!generatePassword || !customPasswordContainer) {
            console.error('❌ togglePasswordOption: Nem található a generatePassword vagy customPasswordContainer elem');
            return;
        }
        
        if (generatePassword.checked) {
            customPasswordContainer.style.display = 'none';
            console.log('✅ Automatikus jelszó generálás bekapcsolva');
        } else {
            customPasswordContainer.style.display = 'block';
            console.log('✅ Egyéni jelszó megadása bekapcsolva');
        }
    } catch (error) {
        console.error('❌ togglePasswordOption hiba:', error);
    }
}

async function handleSuccess(newTagName, newUsername, newTagRank, newUserRole, newTagPhone, password) {
    // Naplóbejegyzés - 'added' MEGENGEDETT
    const roleDisplay = newUserRole === 'admin' ? '👑 Admin' : '👤 User';
    const reason = `Új tag hozzáadva: ${newTagName} (${newTagRank}) - ${roleDisplay}${newTagPhone ? ` - Telefon: ${newTagPhone}` : ''}`;
    
    await logMemberAction(newTagName, 'added', reason);

    // Sikeres üzenet - NEM MUTATJA A JELSZÓT
    let successMessage = `✅ ${newTagName} sikeresen hozzáadva!`;
    successMessage += `<br>👤 IG Név: <strong>${newTagName}</strong>`;
    successMessage += `<br>🔐 Felhasználónév: <strong>${newUsername}</strong>`;
    successMessage += `<br>🎯 Hozzáférés: <strong>${roleDisplay}</strong>`;
    successMessage += `<br>⭐ Rang: <strong>${newTagRank}</strong>`;
    successMessage += `<br><br><small style="color: #718096;">A tag mostantól be tud jelentkezni a megadott felhasználónévvel és jelszóval.</small>`;
    
    showTagAdminMessage(successMessage, 'success');
    
    // Űrlap ürítése
    clearTagAdminForm();
    
    // Adatok frissítése
    loadTagAdminData();
    loadTags();
    loadStats();
}
// Tag Admin űrlap ürítése
function clearTagAdminForm() {
    document.getElementById('newTagName').value = '';
    document.getElementById('newUsername').value = '';
    document.getElementById('newTagRank').value = '';
    document.getElementById('newUserRole').value = 'user';
    document.getElementById('newTagPhone').value = '';
    document.getElementById('customPassword').value = '';
    // Nincs többé jelszó opció váltás
}

// Felhasználó role frissítése
async function updateUserRole(memberName, newRole) {
    try {
        if (!checkAdminAccess() || !newRole) return;

        const { error } = await supabase
            .from('app_users')
            .update({ role: newRole })
            .eq('member_name', memberName);

        if (error) {
            showTagAdminMessage('Hiba a hozzáférés módosításában: ' + error.message, 'error');
        } else {
            showTagAdminMessage(`✅ ${memberName} hozzáférési szintje frissítve: ${newRole === 'admin' ? '👑 Admin' : '👤 User'}!`);
            
            // MÓDOSÍTOTT: 'rank_updated' helyett
            await logMemberAction(memberName, 'rank_updated', 
                `${currentUser.tagName} megváltoztatta a hozzáférését: ${newRole}`);
                
            loadTagAdminData();
        }
    } catch (error) {
        console.error('updateUserRole hiba:', error);
        showTagAdminMessage('Hiba történt a hozzáférés módosítása során', 'error');
    }
}
async function logMemberAction(memberName, action, reason) {
    try {
        // Csak megengedett action értékek
        const allowedActions = ['added', 'kicked', 'deleted', 'rank_updated'];
        
        // Ha nem megengedett az action, használj default értéket
        const safeAction = allowedActions.includes(action) ? action : 'rank_updated';
        
        const { error } = await supabase
            .from('member_history')
            .insert([{
                member_name: memberName,
                action: safeAction,
                reason: reason,
                performed_by: currentUser.tagName
            }]);

        if (error) {
            console.error('Naplóbejegyzés hiba:', error);
        }
    } catch (error) {  // <- ITT IS ELLENŐRIZD
        console.error('logMemberAction váratlan hiba:', error);
    }
}
// Tag Admin modal megnyitása
function openTagAdminModal() {
    if (!checkAdminAccess()) {
        showTagMessage('Csak adminok számára elérhető!', 'warning');
        return;
    }
    
    console.log('👑 Tag Admin modal megnyitása...');
    document.getElementById('tagAdminModal').style.display = 'block';
    loadTagAdminData();
    
    // Inputok ürítése
    clearTagAdminForm();
}

// Tag Admin modal bezárása
function closeTagAdminModal() {
    console.log('👑 Tag Admin modal bezárása');
    document.getElementById('tagAdminModal').style.display = 'none';
}

// Tag Admin adatok betöltése
async function loadTagAdminData() {
    try {
        console.log('🔄 Tag Admin adatok betöltése...');
        await loadTagAdminTags();
        console.log('✅ Tag Admin adatok betöltve');
    } catch (error) {
        console.error('❌ Tag admin data load error:', error);
        showTagAdminMessage('Hiba történt az adatok betöltésekor', 'error');
    }
}

// Tagok betöltése a Tag Admin számára - JAVÍTOTT VERZIÓ
async function loadTagAdminTags() {
    try {
        console.log('🔄 Tag Admin tagok betöltése...');
        
        // Tagok betöltése
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('*')
            .order('created_at', { ascending: false });

        if (membersError) {
            console.error('❌ Tag betöltési hiba:', membersError);
            throw membersError;
        }

        // Felhasználói szerepek betöltése
        const { data: users, error: usersError } = await supabase
            .from('app_users')
            .select('member_name, role');

        if (usersError) {
            console.error('❌ Felhasználói adatok betöltési hiba:', usersError);
        }

        // Felhasználói szerepek összekapcsolása a tagokkal
        const userRolesMap = {};
        if (users) {
            users.forEach(user => {
                userRolesMap[user.member_name] = user.role;
            });
        }

        // Tagok adatainak kiegészítése a szerepekkel
        const tagsWithRoles = members.map(member => ({
            ...member,
            user_role: userRolesMap[member.name] || 'user'
        }));
        
        console.log(`✅ ${tagsWithRoles?.length || 0} tag betöltve`);
        
        const rankHierarchy = {
            'Owner': 1,
            'Co-Owner': 2,
            'Manager': 3,
            'Team Leader': 4,
            'Top Salesman': 5,
            'Sr. Salesman': 6,
            'Jr. Salesman': 7,
            'Towing Specialist': 8,
            'Tow Operator': 9,
            'Truck Driver': 10,
            'Member': 11
        };

        const sortedTags = (tagsWithRoles || []).sort((a, b) => {
            const rankOrderA = rankHierarchy[a.rank] || 99;
            const rankOrderB = rankHierarchy[b.rank] || 99;
            
            if (rankOrderA !== rankOrderB) {
                return rankOrderA - rankOrderB;
            }
            
            return a.name.localeCompare(b.name);
        });
        
        renderTagAdminTags(sortedTags);
        
    } catch (error) {
        console.error('❌ Tag admin tags load error:', error);
        showTagAdminMessage('Hiba történt a tagok betöltésekor', 'error');
    }
}

// Tagok megjelenítése a Tag Admin modalon - GRID ELRENDEZÉSSEL
function renderTagAdminTags(tags) {
    try {
        console.log('🔄 Tagok renderelése:', tags?.length || 0);
        const container = document.getElementById('tagAdminContainer');
        if (!container) {
            console.error('❌ tagAdminContainer nem található');
            return;
        }
        
        if (!tags || tags.length === 0) {
            container.innerHTML = `
                <div class="empty-table-message" style="grid-column: 1 / -1;">
                    👥 Nincsenek tagok<br>
                    <small style="opacity: 0.7;">Adj hozzá egy új tagot a fenti űrlappal!</small>
                </div>
            `;
            console.log('✅ Üres lista renderelve');
            return;
        }
        
        // Használjuk a grid konténert
        container.className = 'tag-admin-grid';
        
        let html = '';
        
        tags.forEach(tag => {
            const rankIcon = getRankIcon(tag.rank);

            // Dátum formázása
            let dateDisplay = '-';
            if (tag.created_at) {
                const date = new Date(tag.created_at);
                dateDisplay = date.toLocaleDateString('hu-HU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            // Telefonszám megjelenítése
            const phoneDisplay = tag.phone ?
                `<div class="tag-phone">
                    📞 ${escapeHtml(tag.phone)}
                </div>` :
                '<div style="color: #a0aec0; font-size: 0.85em; font-style: italic; margin-top: 5px;">nincs telefonszám</div>';

            const safeNameForHandler = String(tag.name)
                .replace(/\\/g, '\\\\')
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
                .replace(/'/g, "\\'");
            const safePhoneForHandler = (tag.phone || '')
                .toString()
                .replace(/\\/g, '\\\\')
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
                .replace(/'/g, "\\'");

            html += `
                <div class="tag-admin-card" id="tag-card-${escapeHtml(tag.name).replace(/'/g, "\\'")}">
                    <div class="tag-admin-header">
                        <div class="tag-admin-info">
                            <div class="tag-admin-name">${escapeHtml(tag.name)}</div>
                            <div class="tag-admin-rank">${rankIcon} ${escapeHtml(tag.rank)}</div>
                            ${phoneDisplay}
                            <div class="tag-admin-date">
                                📅 ${dateDisplay}
                            </div>
                        </div>
                    </div>
                    
                    <div class="tag-admin-actions">
                        <!-- Rang változtatás -->
                        <select onchange="updateTagRank('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)" 
                                class="modern-input" style="padding: 8px; font-size: 0.85em; width: 100%; margin-bottom: 8px;">
                            <option value="">Rang változtatás...</option>
                            <option value="Owner" ${tag.rank === 'Owner' ? 'selected' : ''}>👑 Owner</option>
                            <option value="Co-Owner" ${tag.rank === 'Co-Owner' ? 'selected' : ''}>💎 Co-Owner</option>
                            <option value="Manager" ${tag.rank === 'Manager' ? 'selected' : ''}>💼 Manager</option>
                            <option value="Team Leader" ${tag.rank === 'Team Leader' ? 'selected' : ''}>⭐ Team Leader</option>
                            <option value="Top Salesman" ${tag.rank === 'Top Salesman' ? 'selected' : ''}>🚀 Top Salesman</option>
                            <option value="Sr. Salesman" ${tag.rank === 'Sr. Salesman' ? 'selected' : ''}>🔶 Sr. Salesman</option>
                            <option value="Jr. Salesman" ${tag.rank === 'Jr. Salesman' ? 'selected' : ''}>🔹 Jr. Salesman</option>
                            <option value="Towing Specialist" ${tag.rank === 'Towing Specialist' ? 'selected' : ''}>🔧 Towing Specialist</option>
                            <option value="Tow Operator" ${tag.rank === 'Tow Operator' ? 'selected' : ''}>⚡ Tow Operator</option>
                            <option value="Truck Driver" ${tag.rank === 'Truck Driver' ? 'selected' : ''}>🚛 Truck Driver</option>
                            <option value="Member" ${tag.rank === 'Member' ? 'selected' : ''}>👤 Member</option>
                        </select>

                        <!-- Hozzáférés változtatás -->
                        <select onchange="updateUserRole('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)"
                                class="modern-input" style="padding: 8px; font-size: 0.85em; width: 100%; margin-bottom: 8px;">
                            <option value="">Hozzáférés változtatás...</option>
                            <option value="user" ${tag.user_role === 'user' ? 'selected' : ''}>👤 User</option>
                            <option value="admin" ${tag.user_role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                        </select>

                        <button class="badge-edit-btn" onclick="openEditPhoneModal('${safeNameForHandler}', '${safePhoneForHandler}')">
                            📞 Telefonszám módosítás
                        </button>

                        <!-- JELSZÓ VÁLTÁS GOMB -->
                        <button class="badge-edit-btn" onclick="openChangePasswordForUserModal('${escapeHtml(tag.name).replace(/'/g, "\\'")}', '${escapeHtml(tag.name).replace(/'/g, "\\'")}')">
                            🔐 Jelszó váltás
                        </button>

                        <button class="badge-delete-btn" onclick="openTagAdminKickModal('${escapeHtml(tag.name).replace(/'/g, "\\'")}')">
                            🚫 Kirúgás
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('✅ Tagok renderelve grid elrendezésben:', tags.length);
        
    } catch (error) {
        console.error('❌ renderTagAdminTags hiba:', error);
        showTagAdminMessage('Hiba történt a tagok megjelenítésekor', 'error');
    }
}
// Jelszó váltás modal megnyitása másik felhasználónak
function openChangePasswordForUserModal(memberName, displayName) {
    if (!checkAdminAccess()) return;
    
    currentPasswordChangeMember = memberName;
    document.getElementById('changePasswordForUserName').textContent = displayName;
    document.getElementById('newPasswordForUser').value = '';
    document.getElementById('confirmPasswordForUser').value = '';
    document.getElementById('changePasswordForUserMessage').style.display = 'none';
    
    document.getElementById('changePasswordForUserModal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('newPasswordForUser').focus();
    }, 300);
}

// Jelszó váltás modal bezárása
function closeChangePasswordForUserModal() {
    document.getElementById('changePasswordForUserModal').style.display = 'none';
    currentPasswordChangeMember = null;
}

// Jelszó váltás másik felhasználónak
async function changePasswordForUser() {
    try {
        if (!checkAdminAccess() || !currentPasswordChangeMember) {
            showChangePasswordForUserMessage('Nincs jogosultságod!', 'error');
            return;
        }

        const newPassword = document.getElementById('newPasswordForUser').value;
        const confirmPassword = document.getElementById('confirmPasswordForUser').value;
        
        if (!newPassword || !confirmPassword) {
            showChangePasswordForUserMessage('Minden mező kitöltése kötelező!', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showChangePasswordForUserMessage('A jelszavak nem egyeznek!', 'error');
            return;
        }
        
        if (newPassword.length < 4) {
            showChangePasswordForUserMessage('A jelszó legalább 4 karakter hosszú legyen!', 'error');
            return;
        }

        // Jelszó hash-elése
        const newPasswordHash = btoa(newPassword);

        // Jelszó frissítése az adatbázisban
        const { error } = await supabase
            .from('app_users')
            .update({ 
                password_hash: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .eq('member_name', currentPasswordChangeMember);

        if (error) {
            console.error('Jelszó váltás hiba:', error);
            showChangePasswordForUserMessage('Hiba történt a jelszó váltása során: ' + error.message, 'error');
        } else {
            showChangePasswordForUserMessage(`✅ Jelszó sikeresen megváltoztatva a(z) ${currentPasswordChangeMember} felhasználó számára!`, 'success');
            
            // Naplóbejegyzés - 'rank_updated' használata
            await logMemberAction(currentPasswordChangeMember, 'rank_updated', 
                `${currentUser.tagName} megváltoztatta a jelszavát`);
            
            setTimeout(() => {
                closeChangePasswordForUserModal();
            }, 2000);
        }
        
    } catch (error) {  // <- ITT JAVÍTVA: 'error' paraméter hozzáadva
        console.error('changePasswordForUser hiba:', error);
        showChangePasswordForUserMessage('Váratlan hiba történt!', 'error');
    }
}

// Jelszó váltás üzenetek
function showChangePasswordForUserMessage(text, type = 'success') {
    const messageEl = document.getElementById('changePasswordForUserMessage');
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

function openEditPhoneModal(memberName, currentPhone) {
    if (!checkAdminAccess()) return;

    currentPhoneEditMember = memberName;
    currentPhoneEditValue = currentPhone || '';

    const modal = document.getElementById('editPhoneModal');
    const titleEl = document.getElementById('editPhoneMemberName');
    const inputEl = document.getElementById('editPhoneValue');
    const messageEl = document.getElementById('editPhoneMessage');

    if (!modal || !titleEl || !inputEl || !messageEl) {
        console.error('❌ openEditPhoneModal: hiányzó DOM elemek');
        return;
    }

    titleEl.textContent = memberName;
    inputEl.value = currentPhoneEditValue;
    messageEl.style.display = 'none';
    messageEl.textContent = '';

    modal.style.display = 'block';

    setTimeout(() => {
        inputEl.focus();
    }, 300);
}

function closeEditPhoneModal() {
    const modal = document.getElementById('editPhoneModal');
    if (modal) {
        modal.style.display = 'none';
    }

    currentPhoneEditMember = null;
    currentPhoneEditValue = '';
}

function showEditPhoneMessage(text, type = 'success') {
    const messageEl = document.getElementById('editPhoneMessage');
    if (!messageEl) return;

    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

async function savePhoneForMember() {
    try {
        if (!checkAdminAccess() || !currentPhoneEditMember) {
            showEditPhoneMessage('Nincs jogosultságod!', 'error');
            return;
        }

        const inputEl = document.getElementById('editPhoneValue');
        if (!inputEl) {
            showEditPhoneMessage('Nem található a telefonszám mező!', 'error');
            return;
        }

        const newPhone = inputEl.value.trim();
        const payload = newPhone === '' ? { phone: null } : { phone: newPhone };

        const { error } = await supabase
            .from('members')
            .update(payload)
            .eq('name', currentPhoneEditMember);

        if (error) {
            console.error('Telefonszám frissítés hiba:', error);
            showEditPhoneMessage('Hiba történt a telefonszám mentése során: ' + error.message, 'error');
            return;
        }

        currentPhoneEditValue = newPhone;
        showEditPhoneMessage('✅ Telefonszám sikeresen frissítve!', 'success');

        await logMemberAction(
            currentPhoneEditMember,
            'rank_updated',
            `${currentUser.tagName} megváltoztatta a telefonszámát: ${newPhone || 'törölve'}`
        );

        await loadTagAdminData();
        await loadTags();

        setTimeout(() => {
            closeEditPhoneModal();
        }, 1500);
    } catch (error) {
        console.error('savePhoneForMember hiba:', error);
        showEditPhoneMessage('Váratlan hiba történt!', 'error');
    }
}

// Új tag hozzáadása felhasználói fiókkal együtt - JAVÍTOTT VERZIÓ
// Új tag hozzáadása felhasználói fiókkal együtt - VÉGLEGES JAVÍTOTT VERZIÓ
async function addTagWithAccount() {
    try {
        if (!checkAdminAccess()) return;

        const newTagName = document.getElementById('newTagName').value.trim();
        const newUsername = document.getElementById('newUsername').value.trim();
        const newTagRank = document.getElementById('newTagRank').value;
        const newUserRole = document.getElementById('newUserRole').value;
        const newTagPhone = document.getElementById('newTagPhone').value.trim();
        const password = document.getElementById('customPassword').value; // CSAK EGYÉNI JELSZÓ
        
        // Validációk
        if (!newTagName) {
            showTagAdminMessage('Írd be a tag IG nevét!', 'warning');
            return;
        }
        if (!newUsername) {
            showTagAdminMessage('Írd be a felhasználónevet!', 'warning');
            return;
        }
        if (!newTagRank) {
            showTagAdminMessage('Válassz megjelenítési rangot!', 'warning');
            return;
        }
        if (!newUserRole) {
            showTagAdminMessage('Válassz hozzáférési szintet!', 'warning');
            return;
        }
        if (!password) {
            showTagAdminMessage('Add meg a jelszót!', 'warning');
            return;
        }
        if (password.length < 4) {
            showTagAdminMessage('A jelszó legalább 4 karakter hosszú legyen!', 'warning');
            return;
        }

        console.log('🚀 Tag hozzáadás indítása:', { newTagName, newUsername });

        // 1. TAG beszúrása
        const { error: memberError } = await supabase
            .from('members')
            .insert([{ 
                name: newTagName,
                rank: newTagRank,
                phone: newTagPhone || null,
                created_by: currentUser.tagName
            }]);

        if (memberError) {
            console.error('❌ Tag beszúrás hiba:', memberError);
            if (memberError.code === '23505') {
                showTagAdminMessage(`❌ A(z) "${newTagName}" IG névvel már létezik tag!`, 'error');
            } else {
                showTagAdminMessage('Hiba a tag hozzáadásában: ' + memberError.message, 'error');
            }
            return;
        }

        // 2. FELHASZNÁLÓI FÓK létrehozása
        const passwordHash = btoa(password);
        const { error: userError } = await supabase
            .from('app_users')
            .insert([{
                username: newUsername,
                password_hash: passwordHash,
                role: newUserRole,
                member_name: newTagName,
                rank: newTagRank
            }]);

        if (userError) {
            console.error('❌ Felhasználói fiók hiba:', userError);
            
            // Visszavonjuk a tag létrehozását
            await supabase
                .from('members')
                .delete()
                .eq('name', newTagName);
                
            if (userError.code === '23505') {
                showTagAdminMessage(`❌ A(z) "${newUsername}" felhasználónév már foglalt!`, 'error');
            } else {
                showTagAdminMessage('Hiba a felhasználói fiók létrehozásában: ' + userError.message, 'error');
            }
            return;
        }

        // 3. SIKERES művelet
        console.log('✅ Tag és felhasználói fiók sikeresen létrehozva');
        await handleSuccess(newTagName, newUsername, newTagRank, newUserRole, newTagPhone, password);

    } catch (error) {
        console.error('❌ addTagWithAccount váratlan hiba:', error);
        showTagAdminMessage('Váratlan hiba történt a tag hozzáadása során', 'error');
    }
}


// Tag Admin kirúgás modal
function openTagAdminKickModal(memberName) {
    if (!checkAdminAccess()) return;
    
    currentKickMemberName = memberName;
    document.getElementById('kickMemberName').textContent = memberName;
    document.getElementById('kickReason').value = '';
    document.getElementById('kickModal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('kickReason').focus();
    }, 300);
}

// Tag Admin kirúgás megerősítése - TELJESEN JAVÍTOTT VERZIÓ
async function confirmTagAdminKick() {
    console.log('🔴 confirmTagAdminKick called', currentKickMemberName);
    
    if (!checkAdminAccess() || !currentKickMemberName) {
        console.log('❌ Nincs jogosultság vagy tag név');
        return;
    }

    const reason = document.getElementById('kickReason').value.trim();
    if (!reason) {
        showTagAdminMessage('Add meg a kirúgás indokát!', 'warning');
        return;
    }

    try {
        console.log('🔄 Kirúgás folyamatban:', currentKickMemberName);

        // 1. Naplóbejegyzés
        await logMemberAction(currentKickMemberName, 'kicked', reason);

        // 2. Tag törlése az adatbázisból
        const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .eq('name', currentKickMemberName);

        if (deleteError) {
            console.error('❌ Tag törlési hiba:', deleteError);
            throw deleteError;
        }

        // 3. Felhasználói fiók törlése (ha létezik)
        const { error: userDeleteError } = await supabase
            .from('app_users')
            .delete()
            .eq('member_name', currentKickMemberName);

        if (userDeleteError && userDeleteError.code !== 'PGRST116') {
            console.warn('⚠️ Felhasználói fiók törlése sikertelen:', userDeleteError);
        }

        console.log('✅ Tag sikeresen törölve');

        // 4. Sikeres üzenet
        showTagAdminMessage(`✅ ${currentKickMemberName} sikeresen kirúgva és törölve!`, 'success');

        // 5. Modal bezárása
        closeKickModal();

        // 6. AZONNALI FRISSÍTÉS - TÖBBSZÖRI MEGERŐSÍTÉS
        console.log('🔄 Azonnali frissítés...');
        
        // Első frissítés
        await loadTagAdminData();
        
        // Második frissítés (biztos, ami biztos)
        setTimeout(async () => {
            console.log('🔄 Második frissítés...');
            await loadTagAdminData();
            
            // Harmadik frissítés (háromszor biztos)
            setTimeout(async () => {
                console.log('🔄 Harmadik frissítés...');
                await loadTagAdminData();
                console.log('✅ Minden frissítés befejezve');
            }, 300);
        }, 500);

        // Egyéb listák frissítése
        await loadTags();
        await loadStats();
        
    } catch (error) {
        console.error('❌ confirmTagAdminKick hiba:', error);
        showTagAdminMessage('Hiba történt a kirúgás során: ' + error.message, 'error');
    }
}

// Kirúgás modal bezárása
function closeKickModal() {
    console.log('🔴 closeKickModal called');
    document.getElementById('kickModal').style.display = 'none';
    currentKickMemberName = null;
}