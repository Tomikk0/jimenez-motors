// === TAG KEZELÉSI FUNKCIÓK ===

// Tag hozzáadása - CSAK ADMIN
async function addTag() {
    try {
        if (!checkAdminAccess()) return;

        const newTag = document.getElementById('newTag').value.trim();
        if (!newTag) {
            showTagMessage('Írj be egy tag nevet!', 'warning');
            return;
        }

        const { error } = await supabase
            .from('members')
            .insert([{ 
                name: newTag,
                created_by: currentUser.tagName
            }]);

        if (error) {
            if (error.code === '23505') {
                showTagMessage('Ez a tag már létezik!', 'error');
            } else {
                showTagMessage('Hiba: ' + error.message, 'error');
            }
        } else {
            showTagMessage('✅ Tag hozzáadva!');
            document.getElementById('newTag').value = '';
            loadTags();
            loadStats();
            
            // Naplóbejegyzés a felvételről
            await logMemberAction(newTag, 'added', ``);
        }
    } catch (error) {
        console.error('addTag hiba:', error);
        showTagMessage('Hiba történt a tag hozzáadása során', 'error');
    }
}

// Tag kirúgása - CSAK ADMIN
function openKickModal(memberName) {
    if (!checkAdminAccess()) return;
    
    currentKickMemberName = memberName;
    document.getElementById('kickMemberName').textContent = memberName;
    document.getElementById('kickReason').value = '';
    document.getElementById('kickModal').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('kickReason').focus();
    }, 300);
}

function closeKickModal() {
    document.getElementById('kickModal').style.display = 'none';
    currentKickMemberName = null;
}

async function confirmKick() {
    if (!checkAdminAccess() || !currentKickMemberName) return;

    const reason = document.getElementById('kickReason').value.trim();
    if (!reason) {
        showTagMessage('Add meg a kirúgás indokát!', 'warning');
        return;
    }

    try {
        // Naplóbejegyzés először
        await logMemberAction(currentKickMemberName, 'kicked', reason);

        // Tag törlése az adatbázisból
        const { error: deleteError } = await supabase
            .from('members')
            .delete()
            .eq('name', currentKickMemberName);

        if (deleteError) throw deleteError;

        showTagMessage(`✅ ${currentKickMemberName} sikeresen kirúgva és törölve!`);
        closeKickModal();
        loadTags();
        loadStats();
        
    } catch (error) {
        console.error('confirmKick hiba:', error);
        showTagMessage('Hiba történt a kirúgás során', 'error');
    }
}

// Naplóbejegyzés készítése
async function logMemberAction(memberName, action, reason) {
    try {
        const { error } = await supabase
            .from('member_history')
            .insert([{
                member_name: memberName,
                action: action,
                reason: reason,
                performed_by: currentUser.tagName
            }]);

        if (error) {
            console.error('Naplóbejegyzés hiba:', error);
        }
    } catch (error) {
        console.error('logMemberAction hiba:', error);
    }
}

// Tagok betöltése
async function loadTags() {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('id, name, rank, phone, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (typeof updateTagCaches === 'function') {
            updateTagCaches(data || []);
        }

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

        const sortedTags = (data || []).sort((a, b) => {
            const rankOrderA = rankHierarchy[a.rank] || 99;
            const rankOrderB = rankHierarchy[b.rank] || 99;
            
            if (rankOrderA !== rankOrderB) {
                return rankOrderA - rankOrderB;
            }
            
            return a.name.localeCompare(b.name);
        }).map(tag => ({
            id: tag.id,
            name: tag.name,
            rank: tag.rank,
            created_at: tag.created_at // Hozzáadva a dátum
        }));
        
        renderTags(sortedTags);
    } catch (error) {
        console.error('Tags load error:', error);
        showTagMessage('Hiba történt a tagok betöltésekor', 'error');
    }
}

// Tagok megjelenítése
function renderTags(tags) {
    try {
        const tbody = document.getElementById('tagsTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (!tags || tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-table-message">Nincs megjeleníthető tag</td></tr>';
            return;
        }
        
        tags.forEach(tag => {
            const row = document.createElement('tr');
            
            const rankIcon = getRankIcon(tag.rank);
            const rankDisplay = tag.rank ? `${rankIcon} ${escapeHtml(tag.rank)}` : 'Nincs rang';
            
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
            
            let actionCell = '';
            if (currentUser && currentUser.role === 'admin') {
                // CSAK ADMIN LÁTHATJA A MŰVELET GOMBOKAT
                let actionButtons = '';
            } else {
                // NEM ADMIN VAGY NINCS BEJELENTKEZVE - ÜRES CELL (de nem fehér karika)
                actionCell = '<td style="display: none;"></td>';
            }
            
            row.innerHTML = `
                <td style="font-weight: 600; color: #2d3748;">${escapeHtml(tag.name)}</td>
                <td style="color: #4a5568;">${rankDisplay}</td>
                <td style="color: #718096; font-size: 0.9em;">${dateDisplay}</td>
                ${actionCell}
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('renderTags hiba:', error);
        showTagMessage('Hiba történt a tagok megjelenítésekor', 'error');
    }
}

// Rang frissítése - CSAK ADMIN
async function updateTagRank(tagName, newRank) {
    try {
        if (!checkAdminAccess()) return;

        if (!newRank) return;

        const { error } = await supabase
            .from('members')
            .update({ rank: newRank })
            .eq('name', tagName);

        if (error) {
            showTagMessage('Hiba: ' + error.message, 'error');
        } else {
            showTagMessage('✅ Rang frissítve!');
            loadTags();
            
            await logMemberAction(tagName, 'rank_updated', 
                `${currentUser.tagName} megváltoztatta a rangját: ${newRank}`);
        }
    } catch (error) {
        console.error('updateTagRank hiba:', error);
        showTagMessage('Hiba történt a rang frissítése során', 'error');
    }
}

// === TAG TÖRTÉNET NAPLÓ ===

// Kirúgott tagok naplójának megjelenítése - CSAK ADMIN
async function showKickedMembersHistory() {
    if (!checkAdminAccess()) return;

    try {
        document.getElementById('kickedMembersModal').style.display = 'block';
        
        // ÖSSZES tag történet betöltése (felvétel és kirúgás is)
        const { data, error } = await supabase
            .from('member_history')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        renderKickedMembersHistory(data || []);
        
    } catch (error) {
        console.error('showKickedMembersHistory hiba:', error);
        document.getElementById('kickedMembersList').innerHTML = `
            <div class="history-empty">
                ❌ Hiba történt a napló betöltése során
            </div>
        `;
    }
}

function closeKickedMembersModal() {
    document.getElementById('kickedMembersModal').style.display = 'none';
}

// Napló megjelenítése - ÖSSZES MŰVELET (felvétel és kirúgás)
function renderKickedMembersHistory(history) {
    const container = document.getElementById('kickedMembersList');
    
    if (!history || history.length === 0) {
        container.innerHTML = `
            <div class="history-empty">
                📝 Még nincs tag történet
            </div>
        `;
        return;
    }

    let html = '';
    
    history.forEach(record => {
        const date = new Date(record.created_at);
        const formattedDate = date.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Művelet ikon és szín
        let actionIcon = '';
        let actionColor = '';
        let actionText = '';
        
        switch(record.action) {
            case 'added':
                actionIcon = '➕';
                actionColor = '#48bb78';
                actionText = 'Felvéve';
                break;
            case 'kicked':
                actionIcon = '🚫';
                actionColor = '#e53e3e';
                actionText = 'Kirúgva';
                break;
            case 'rank_updated':
                actionIcon = '⭐';
                actionColor = '#d69e2e';
                actionText = 'Rang változás';
                break;
            default:
                actionIcon = '📝';
                actionColor = '#718096';
                actionText = record.action;
        }

        html += `
            <div class="history-item">
                <div class="history-header">
                    <div class="history-member-name">${escapeHtml(record.member_name)}</div>
                    <div class="history-date">${formattedDate}</div>
                </div>
                <div class="history-reason" style="border-left-color: ${actionColor}">
                    <strong>${actionIcon} ${actionText}</strong><br>
                    ${escapeHtml(record.reason)}
                </div>
                <div class="history-meta">
                    <span>Által:</span>
                    <span class="history-kicked-by">${escapeHtml(record.performed_by)}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// === KITŰZŐ FUNKCIÓK ===

// Kitűző modal megnyitása - CSAK ADMINOKNAK
function openBadgeModal() {
    if (!checkAdminAccess()) return;
    
    document.getElementById('badgeModal').style.display = 'block';
    loadBadges();
    
    // Inputok ürítése
    document.getElementById('badgeRankSelect').value = '';
    document.getElementById('badgeNote').value = '';
}

// Kitűző modal bezárása
function closeBadgeModal() {
    document.getElementById('badgeModal').style.display = 'none';
}

// Kitűzők betöltése
async function loadBadges() {
    try {
        const { data: badges, error } = await supabase
            .from('badges')
            .select('*')
            .order('rank');

        if (error) throw error;

        // Tagok betöltése a számoláshoz
        const { data: members, error: membersError } = await supabase
            .from('members')
            .select('rank, name');

        if (membersError) throw membersError;

        // Rangok szerinti tagok számolása
        const rankCounts = {};
        if (members) {
            members.forEach(member => {
                rankCounts[member.rank] = (rankCounts[member.rank] || 0) + 1;
            });
        }

        renderBadges(badges || [], rankCounts);
    } catch (error) {
        console.error('Badges load error:', error);
        document.getElementById('badgeContainer').innerHTML = `
            <div class="empty-table-message">
                ❌ Hiba történt a kitűzők betöltésekor
            </div>
        `;
    }
}

// Kitűzők megjelenítése
function renderBadges(badges, rankCounts) {
    const container = document.getElementById('badgeContainer');
    
    if (!badges || badges.length === 0) {
        container.innerHTML = `
            <div class="empty-table-message">
                📝 Még nincsenek kitűzők<br>
                <small style="opacity: 0.7;">Adj hozzá megjegyzéseket a rangokhoz!</small>
            </div>
        `;
        return;
    }

    const rankHierarchy = {
        'Owner': { icon: '👑', order: 1 },
        'Co-Owner': { icon: '💎', order: 2 },
        'Manager': { icon: '💼', order: 3 },
        'Team Leader': { icon: '⭐', order: 4 },
        'Top Salesman': { icon: '🚀', order: 5 },
        'Sr. Salesman': { icon: '🔶', order: 6 },
        'Jr. Salesman': { icon: '🔹', order: 7 },
        'Towing Specialist': { icon: '🔧', order: 8 },
        'Tow Operator': { icon: '⚡', order: 9 },
        'Truck Driver': { icon: '🚛', order: 10 },
        'Member': { icon: '👤', order: 11 }
    };

    // Rendezés rang hierarchia szerint
    const sortedBadges = badges.sort((a, b) => {
        const orderA = rankHierarchy[a.rank]?.order || 99;
        const orderB = rankHierarchy[b.rank]?.order || 99;
        return orderA - orderB;
    });

    let html = '';
    
    sortedBadges.forEach(badge => {
        const rankInfo = rankHierarchy[badge.rank] || { icon: '👤', order: 99 };
        const memberCount = rankCounts[badge.rank] || 0;
        
        html += `
            <div class="badge-card">
                <div class="badge-rank-header">
                    <div class="badge-rank-icon">${rankInfo.icon}</div>
                    <div class="badge-rank-info">
                        <div class="badge-rank-name">${escapeHtml(badge.rank)}</div>
                        <div class="badge-members-count">${memberCount} tag</div>
                    </div>
                </div>
                
                <div class="badge-note-section">
                    <div class="badge-note-label">
                        📝 Megjegyzés
                        <span style="color: #667eea; font-size: 0.8em;">(Admin only)</span>
                    </div>
                    <div class="badge-note-content">
                        ${formatBadgeNote(badge.note)}
                    </div>
                </div>
                
                <div class="badge-actions">
                    <button class="badge-edit-btn" onclick="editBadgeNote('${escapeHtml(badge.rank).replace(/'/g, "\\'")}', '${escapeHtml(badge.note || '').replace(/'/g, "\\'")}')">
                        ✏️ Megjegyzés szerkesztése
                    </button>
                    ${badge.note ? `
                    <button class="badge-delete-btn" onclick="deleteBadgeNote('${escapeHtml(badge.rank).replace(/'/g, "\\'")}')">
                        ❌ Megjegyzés törlése
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Megjegyzés szerkesztése - CSAK ADMIN
function editBadgeNote(rank, currentNote) {
    if (!checkAdminAccess()) return;

    // Kitöltjük a formot a szerkesztéshez
    document.getElementById('badgeRankSelect').value = rank;
    document.getElementById('badgeNote').value = currentNote || '';

    // Görgetés a formhoz
    document.getElementById('badgeNote').focus();
}

// Új megjegyzés hozzáadása - CSAK ADMIN
async function addBadgeNote() {
    try {
        if (!checkAdminAccess()) return;

        const rank = document.getElementById('badgeRankSelect').value;
        const note = document.getElementById('badgeNote').value.trim();

        if (!rank) {
            showBadgeMessage('Válassz rangot!', 'warning');
            return;
        }

        if (!note) {
            showBadgeMessage('Írj megjegyzést!', 'warning');
            return;
        }

        // Ellenőrizzük, hogy létezik-e már a rang
        const { data: existingBadge, error: checkError } = await supabase
            .from('badges')
            .select('id')
            .eq('rank', rank)
            .single();

        let result;
        if (existingBadge) {
            // Frissítés
            result = await supabase
                .from('badges')
                .update({ 
                    note: note,
                    updated_by: currentUser.tagName,
                    updated_at: new Date().toISOString()
                })
                .eq('rank', rank);
        } else {
            // Új létrehozása
            result = await supabase
                .from('badges')
                .insert([{ 
                    rank: rank,
                    note: note,
                    updated_by: currentUser.tagName
                }]);
        }

        if (result.error) throw result.error;

        showBadgeMessage('✅ Megjegyzés mentve!', 'success');
        document.getElementById('badgeNote').value = '';
        document.getElementById('badgeRankSelect').value = '';
        loadBadges();
        
    } catch (error) {
        console.error('addBadgeNote hiba:', error);
        showBadgeMessage('Hiba történt a mentés során', 'error');
    }
}

// Megjegyzés törlése - CSAK ADMIN
async function deleteBadgeNote(rank) {
    if (!checkAdminAccess()) return;
    
    const confirmDelete = confirm(`Biztosan törölni szeretnéd a(z) "${rank}" rang megjegyzését?`);
    
    if (!confirmDelete) return;
    
    try {
        const { error } = await supabase
            .from('badges')
            .delete()
            .eq('rank', rank);

        if (error) throw error;

        showBadgeMessage('✅ Megjegyzés törölve!', 'success');
        
        // Form reset
        document.getElementById('badgeRankSelect').value = '';
        document.getElementById('badgeNote').value = '';
        
        // Újratöltés
        loadBadges();
        
    } catch (error) {
        console.error('deleteBadgeNote hiba:', error);
        showBadgeMessage('Hiba történt a törlés során', 'error');
    }
}

// Kitűzők frissítése
async function refreshBadges() {
    try {
        await loadBadges();
        showBadgeMessage('✅ Kitűzők frissítve!', 'success');
    } catch (error) {
        console.error('refreshBadges hiba:', error);
        showBadgeMessage('Hiba történt a frissítés során', 'error');
    }
}