<script>
  let tuningOptions = [];
  let modelOptions = [];
  let tagOptions = [];
  let allCars = [];
  let currentUser = null;
  let searchTimeout;
  let selectedImage = null;

  // ===== KÉPKEZELÉS =====
  function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Fájl méret ellenőrzése (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('A kép mérete túl nagy! Maximum 5MB lehet.', 'error');
      return;
    }

    // Fájltípus ellenőrzése
    if (!file.type.match('image.*')) {
      showMessage('Csak képeket tölthetsz fel!', 'error');
      return;
    }

    // Fájlnév megjelenítése
    document.getElementById('imageFileName').textContent = file.name;

    // Előnézet megjelenítése
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = `<img src="${e.target.result}" alt="Előnézet">`;
      
      // Kép adatainak elmentése
      selectedImage = {
        data: e.target.result.split(',')[1], // Base64 adat
        name: file.name,
        type: file.name.split('.').pop(),
        mimeType: file.type
      };
    };
    reader.readAsDataURL(file);
  }

  function clearImage() {
    document.getElementById('carImage').value = '';
    document.getElementById('imageFileName').textContent = 'Nincs kép kiválasztva';
    document.getElementById('imagePreview').innerHTML = '';
    selectedImage = null;
  }

  function showImageModal(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <span class="close-modal" onclick="this.parentElement.style.display='none'">&times;</span>
      <img class="modal-content" src="${imageUrl}">
    `;
    document.body.appendChild(modal);

    // Kattintás a modal-on kívülre bezárja
    modal.onclick = function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
        document.body.removeChild(modal);
      }
    };
  }

  // ===== SEGÉDFÜGGVÉNYEK =====
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validateCarData(car) {
    const errors = [];
    
    if (!car.Model || car.Model.trim() === '') {
      errors.push('A modell megadása kötelező');
    }
    
    if (car.VetelAr && isNaN(parseInt(car.VetelAr))) {
      errors.push('A vételár érvényes szám legyen');
    }
    
    if (car.EladasiAr && isNaN(parseInt(car.EladasiAr))) {
      errors.push('Az eladási ár érvényes szám legyen');
    }
    
    if (car.VetelAr && car.EladasiAr) {
      const vetel = parseInt(car.VetelAr);
      const eladas = parseInt(car.EladasiAr);
      if (eladas < vetel) {
        errors.push('Az eladási ár nem lehet kisebb a vételárnál');
      }
    }
    
    return errors;
  }

  // ===== ALAP FUNKCIÓK =====
  function showPage(pageName) {
    try {
      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
      
      document.getElementById(pageName + 'Page').classList.add('active');
      document.querySelector(`[onclick="showPage('${pageName}')"]`).classList.add('active');
      
      if (pageName === 'autok') loadCars();
      else if (pageName === 'tagok') loadTags();
      else if (pageName === 'statisztika') loadStats();
    } catch (error) {
      console.error('showPage hiba:', error);
      showMessage('Hiba történt az oldalváltás során', 'error');
    }
  }

  function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
  }

  function showLoginMessage(text, type = 'success') {
    const messageEl = document.getElementById('loginMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
  }

  function showTagMessage(text, type = 'success') {
    const messageEl = document.getElementById('tagMessage');
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => { messageEl.style.display = 'none'; }, 3000);
  }

  // ===== BEJELENTKEZÉS =====
  function login() {
    try {
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      if (!username || !password) {
        showLoginMessage('Írd be a felhasználónevet és jelszót!', 'warning');
        return;
      }

      google.script.run.withSuccessHandler(result => {
        if (result.success) {
          currentUser = { 
            username: username, 
            password: password, 
            role: result.role,
            tagName: result.tagName,
            rank: result.rank 
          };
          document.getElementById('adminFunctions').style.display = 'block';
          document.getElementById('tagAdminFunctions').style.display = 'block';
          document.getElementById('kivantHeader').style.display = 'table-cell';
          document.getElementById('statusHeader').style.display = 'table-cell';
          document.getElementById('actionHeader').style.display = 'table-cell';
          document.getElementById('tagActionHeader').style.display = 'table-cell';
          document.querySelectorAll('.login-btn').forEach(btn => {
            btn.innerHTML = '🚪 Kijelentkezés (' + result.tagName + ')';
            btn.onclick = logout;
          });
          
          document.body.classList.add('logged-in');
          
          showPage('autok');
          showMessage('Sikeres bejelentkezés!', 'success');
        } else {
          showLoginMessage(result.message, 'error');
        }
      }).withFailureHandler(error => {
        showLoginMessage('Hiba történt a bejelentkezés során', 'error');
      }).verifyUser(username, password);
    } catch (error) {
      console.error('Login hiba:', error);
      showLoginMessage('Hiba történt a bejelentkezés során', 'error');
    }
  }

  function logout() {
    try {
      currentUser = null;
      document.getElementById('adminFunctions').style.display = 'none';
      document.getElementById('tagAdminFunctions').style.display = 'none';
      document.getElementById('kivantHeader').style.display = 'none';
      document.getElementById('statusHeader').style.display = 'none';
      document.getElementById('actionHeader').style.display = 'none';
      document.getElementById('tagActionHeader').style.display = 'none';
      document.querySelectorAll('.login-btn').forEach(btn => {
        btn.innerHTML = '🔐 Bejelentkezés';
        btn.onclick = () => showPage('login');
      });
      
      document.body.classList.remove('logged-in');
      
      showPage('autok');
      showMessage('Sikeres kijelentkezés!', 'success');
    } catch (error) {
      console.error('Logout hiba:', error);
    }
  }

  // ===== ADATBETÖLTÉS =====
  function loadAllData() {
    try {
      loadTuningOptions();
      loadModelOptions();
      loadTagOptions();
      loadCars();
    } catch (error) {
      console.error('loadAllData hiba:', error);
      showMessage('Hiba történt az adatok betöltésekor', 'error');
    }
  }

  function loadTuningOptions() {
    google.script.run.withSuccessHandler(options => {
      tuningOptions = options;
      renderTuningOptions(options);
    }).withFailureHandler(error => {
      console.error('Tuning options load error:', error);
    }).getTuningOptions();
  }

  function renderTuningOptions(options) {
    try {
      const container = document.getElementById('tuningContainer');
      if (!container) return;
      
      container.innerHTML = '';
      if (!options || options.length === 0) {
        container.textContent = 'Nincs tuning opció.';
        return;
      }
      options.forEach(optText => {
        const div = document.createElement('div');
        div.className = 'tuning-option';
        div.textContent = escapeHtml(optText);
        div.onclick = () => div.classList.toggle('selected');
        container.appendChild(div);
      });
    } catch (error) {
      console.error('renderTuningOptions hiba:', error);
    }
  }

  function loadModelOptions() {
    google.script.run.withSuccessHandler(models => {
      modelOptions = models;
    }).withFailureHandler(error => {
      console.error('Model options load error:', error);
    }).getModelOptions();
  }

  function loadTagOptions() {
    google.script.run.withSuccessHandler(tags => {
      tagOptions = tags || [];
    }).withFailureHandler(error => {
      console.error('Tag options load error:', error);
    }).getTagOptions();
  }

  function loadCars() {
    google.script.run.withSuccessHandler(cars => {
      allCars = cars;
      renderCars(cars);
    }).withFailureHandler(error => {
      console.error('Cars load error:', error);
      showMessage('Hiba történt az autók betöltésekor', 'error');
    }).getData();
  }

  function loadTags() {
    google.script.run.withSuccessHandler(tags => {
      renderTags(tags);
    }).withFailureHandler(error => {
      console.error('Tags load error:', error);
      showTagMessage('Hiba történt a tagok betöltésekor', 'error');
    }).getTagOptions();
  }

  function loadStats() {
    try {
      const totalCars = allCars.length;
      const soldCars = allCars.filter(car => car.Eladva).length;
      
      document.getElementById('totalCars').textContent = totalCars;
      document.getElementById('soldCars').textContent = soldCars;
      document.getElementById('totalTags').textContent = tagOptions.length;
      
      let totalProfit = 0;
      allCars.forEach(car => {
        if (car.Eladva) {
          const vetel = parseFloat(car.VetelAr) || 0;
          const eladas = parseFloat(car.EladasiAr) || 0;
          if (vetel > 0 && eladas > 0) {
            totalProfit += (eladas - vetel);
          }
        }
      });
      
      const formattedProfit = new Intl.NumberFormat('hu-HU').format(totalProfit);
      document.getElementById('totalProfit').textContent = formattedProfit + ' $';
      
      const modelCount = {};
      allCars.forEach(car => {
        if (car.Model) {
          modelCount[car.Model] = (modelCount[car.Model] || 0) + 1;
        }
      });
      
      let popularModel = '-';
      let maxCount = 0;
      for (const model in modelCount) {
        if (modelCount[model] > maxCount) {
          maxCount = modelCount[model];
          popularModel = model;
        }
      }
      document.getElementById('popularModel').textContent = popularModel;
    } catch (error) {
      console.error('loadStats hiba:', error);
    }
  }

  // ===== MEGJELENÍTÉS =====
  function renderCars(cars) {
    try {
      const tbody = document.getElementById('carTableBody');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      
      if (!cars || cars.length === 0) {
        const colCount = currentUser ? 9 : 6;
        tbody.innerHTML = `<tr><td colspan="${colCount}">Nincs adat</td></tr>`;
        return;
      }
      
      cars.forEach(c => {
        const row = document.createElement('tr');
        
        const vetelAr = c.VetelArFormatted || c.VetelAr || '';
        const kivantAr = c.KivantArFormatted || c.KivantAr || '';
        const eladasiAr = c.EladasiArFormatted || c.EladasiAr || '';
        
        // KÉP CELL - BASE64 VERZIÓ
        let imageHtml = '';
        if (c.KepURL && c.KepURL.trim() !== '' && c.KepURL.startsWith('data:image')) {
          imageHtml = `
            <td>
              <img src="${c.KepURL}" 
                   class="car-image" 
                   onclick="showImageModal('${c.KepURL}')"
                   alt="${escapeHtml(c.Model || '')}">
            </td>
          `;
        } else {
          imageHtml = `<td><div class="no-image">Nincs<br>kép</div></td>`;
        }
        
        let rowHtml = `
          ${imageHtml}
          <td>${escapeHtml(c.Model || '')}</td>
          <td>${escapeHtml(c.Tuning || '')}</td>
        `;
        
        if (currentUser) {
          rowHtml += `<td>${vetelAr ? escapeHtml(vetelAr) + ' $' : ''}</td>`;
        } else {
          rowHtml += `<td class="hidden-price">*****</td>`;
        }
        
        if (currentUser) {
          rowHtml += `<td class="kivant-ar">${kivantAr ? escapeHtml(kivantAr) + ' $' : ''}</td>`;
        }
        
        rowHtml += `
          <td>${eladasiAr ? escapeHtml(eladasiAr) + ' $' : ''}</td>
          <td>${escapeHtml(c.Hozzáadta || '')}</td>
        `;
        
        if (currentUser) {
          const statusCell = c.Eladva ? 
            `<td><span style="color: green; font-weight: bold;">✅ ELADVA</span></td>` :
            `<td><span style="color: orange; font-weight: bold;">💰 ELADÓ</span></td>`;
          rowHtml += statusCell;
        }
        
        if (currentUser) {
          const canDelete = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
          const canMarkSold = (c.Hozzáadta === currentUser.tagName || currentUser.role === 'admin');
          
          let buttonsHtml = '';
          
          if (canDelete) {
            buttonsHtml += `<button class="btn-del" onclick="deleteCar('${escapeHtml(c.Model).replace(/'/g, "\\'")}')">❌</button> `;
          }
          
          if (!c.Eladva && canMarkSold) {
            buttonsHtml += `<button class="btn-sold" onclick="markAsSold('${escapeHtml(c.Model).replace(/'/g, "\\'")}')">💰</button>`;
          }
          
          rowHtml += `<td>${buttonsHtml}</td>`;
        }
        
        if (c.Eladva) {
          row.classList.add('sold-car');
        }
        
        row.innerHTML = rowHtml;
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error('renderCars hiba:', error);
      showMessage('Hiba történt az autók megjelenítésekor', 'error');
    }
  }

  function renderTags(tags) {
    try {
      const tbody = document.getElementById('tagsTableBody');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      
      if (!tags || tags.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Nincs tag</td></tr>';
        return;
      }
      
      tags.forEach(tag => {
        const row = document.createElement('tr');
        
        const rankIcon = getRankIcon(tag.rank);
        const rankDisplay = tag.rank ? `${rankIcon} ${escapeHtml(tag.rank)}` : 'Nincs rang';
        
        let actionCell = '';
        if (currentUser) {
          actionCell = `
            <td>
              <div class="action-buttons">
                ${currentUser.role === 'admin' ? `
                  <select onchange="updateTagRank('${escapeHtml(tag.name).replace(/'/g, "\\'")}', this.value)" class="rank-select">
                    <option value="">Válassz rangot</option>
                    <option value="Owner" ${tag.rank === 'Owner' ? 'selected' : ''}>Owner</option>
                    <option value="Co-Owner" ${tag.rank === 'Co-Owner' ? 'selected' : ''}>Co-Owner</option>
                    <option value="Manager" ${tag.rank === 'Manager' ? 'selected' : ''}>Manager</option>
                    <option value="Team Leader" ${tag.rank === 'Team Leader' ? 'selected' : ''}>Team Leader</option>
                    <option value="Top Salesman" ${tag.rank === 'Top Salesman' ? 'selected' : ''}>Top Salesman</option>
                    <option value="Sr. Salesman" ${tag.rank === 'Sr. Salesman' ? 'selected' : ''}>Sr. Salesman</option>
                    <option value="Jr. Salesman" ${tag.rank === 'Jr. Salesman' ? 'selected' : ''}>Jr. Salesman</option>
                    <option value="Towing Specialist" ${tag.rank === 'Towing Specialist' ? 'selected' : ''}>Towing Specialist</option>
                    <option value="Tow Operator" ${tag.rank === 'Tow Operator' ? 'selected' : ''}>Tow Operator</option>
                    <option value="Truck Driver" ${tag.rank === 'Truck Driver' ? 'selected' : ''}>Truck Driver</option>
                  </select>
                  <button class="btn-del" onclick="deleteTag('${escapeHtml(tag.name).replace(/'/g, "\\'")}')">❌</button>
                ` : ''}
              </div>
            </td>
          `;
        } else {
          actionCell = '<td></td>';
        }
        
        row.innerHTML = `
          <td>${escapeHtml(tag.name)}</td>
          <td>${rankDisplay}</td>
          ${actionCell}
        `;
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error('renderTags hiba:', error);
      showTagMessage('Hiba történt a tagok megjelenítésekor', 'error');
    }
  }

  function getRankIcon(rank) {
    switch(rank) {
      case 'Owner': return '👑';
      case 'Co-Owner': return '💎';
      case 'Manager': return '💼';
      case 'Team Leader': return '⭐';
      case 'Top Salesman': return '🚀';
      case 'Sr. Salesman': return '🔶';
      case 'Jr. Salesman': return '🔹';
      case 'Towing Specialist': return '🔧';
      case 'Tow Operator': return '⚡';
      case 'Truck Driver': return '🚛';
      default: return '👤';
    }
  }

  // ===== KERESŐ FUNKCIÓK =====
  function formatInputPrice(input) {
    try {
      const value = input.value.replace(/[^\d]/g, '');
      if (value) {
        const formatted = new Intl.NumberFormat('hu-HU').format(parseInt(value));
        input.value = formatted;
      }
    } catch (error) {
      console.error('formatInputPrice hiba:', error);
    }
  }

  function showModelDropdown() {
    try {
      const dropdown = document.getElementById('modelDropdown');
      if (!dropdown) return;
      
      const searchValue = document.getElementById('modelSearch').value.toLowerCase();
      
      if (searchValue === '') {
        renderModelDropdown(modelOptions);
      } else {
        filterModels();
      }
      
      dropdown.style.display = 'block';
    } catch (error) {
      console.error('showModelDropdown hiba:', error);
    }
  }

  function filterModels() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      try {
        const searchValue = document.getElementById('modelSearch').value.toLowerCase();
        const filteredModels = modelOptions.filter(model => 
          model.toLowerCase().includes(searchValue)
        );
        renderModelDropdown(filteredModels);
      } catch (error) {
        console.error('filterModels hiba:', error);
      }
    }, 300);
  }

  function renderModelDropdown(models) {
    try {
      const dropdown = document.getElementById('modelDropdown');
      if (!dropdown) return;
      
      dropdown.innerHTML = '';
      
      if (models.length === 0) {
        dropdown.innerHTML = '<div class="model-option">Nincs találat</div>';
        return;
      }
      
      models.forEach(model => {
        const option = document.createElement('div');
        option.className = 'model-option';
        option.textContent = escapeHtml(model);
        option.onclick = () => onModelSelected(model);
        dropdown.appendChild(option);
      });
    } catch (error) {
      console.error('renderModelDropdown hiba:', error);
    }
  }

  function onModelSelected(model) {
    try {
      document.getElementById('modelSearch').value = model;
      document.getElementById('modelDropdown').style.display = 'none';
    } catch (error) {
      console.error('onModelSelected hiba:', error);
    }
  }

  // ===== MÓDOSÍTÓ FUNKCIÓK =====
  function addCar() {
    try {
      if (!currentUser) {
        showMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      const selectedModel = document.getElementById('modelSearch').value.trim();
      const selectedTuning = Array.from(document.querySelectorAll('.tuning-option.selected'))
        .map(div => div.textContent)
        .join(', ');

      if (!selectedModel) {
        showMessage('Válassz modellt!', 'warning');
        return;
      }

      const vetelAr = document.getElementById('vetel').value.replace(/[^\d]/g, '');
      const kivantAr = document.getElementById('kivant').value.replace(/[^\d]/g, '');
      const eladasiAr = document.getElementById('eladas').value.replace(/[^\d]/g, '');

      const car = {
        Model: selectedModel,
        Tuning: selectedTuning,
        VetelAr: vetelAr,
        KivantAr: kivantAr,
        EladasiAr: eladasiAr
      };

      const validationErrors = validateCarData(car);
      if (validationErrors.length > 0) {
        showMessage(validationErrors.join(', '), 'error');
        return;
      }

      // Kép feltöltése - CSAK HA VAN KIVÁLASZTOTT KÉP
      let imageToUpload = null;
      if (selectedImage && selectedImage.data && selectedImage.data.trim() !== '') {
        imageToUpload = selectedImage;
      }

      google.script.run.withSuccessHandler((result) => {
        if (result.success) {
          showMessage(result.message);
          clearInputs();
          clearImage();
          loadCars();
          loadStats();
        } else {
          showMessage(result.message, 'error');
        }
      }).withFailureHandler(error => {
        showMessage('Hiba történt: ' + error.message, 'error');
      }).addCar(car, currentUser.username, currentUser.password, imageToUpload);

    } catch (error) {
      console.error('addCar hiba:', error);
      showMessage('Hiba történt az autó hozzáadása során', 'error');
    }
  }

  function markAsSold(model) {
    try {
      if (!currentUser) {
        showMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      google.script.run
        .withSuccessHandler((result) => {
          if (result === 'Marked as sold') {
            showMessage('Autó eladva státuszba állítva!', 'success');
            loadCars();
            loadStats();
          } else if (result === 'Not your car') {
            showMessage('Csak a saját autódat jelölheted eladottnak!', 'error');
          } else if (result === 'Invalid login') {
            showMessage('Érvénytelen bejelentkezés!', 'error');
            logout();
          } else {
            showMessage('Hiba: ' + result, 'error');
          }
        })
        .withFailureHandler(error => {
          showMessage('Hiba történt: ' + error.message, 'error');
        })
        .markAsSold(model, currentUser.username, currentUser.password);
    } catch (error) {
      console.error('markAsSold hiba:', error);
      showMessage('Hiba történt az eladott státusz beállítása során', 'error');
    }
  }

  function deleteCar(model) {
    try {
      if (!currentUser) {
        showMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      google.script.run
        .withSuccessHandler((result) => {
          if (result === 'Deleted') {
            showMessage('Autó sikeresen törölve!', 'success');
            loadCars();
            loadStats();
          } else if (result === 'Not your car') {
            showMessage('Csak a saját autódat törölheted!', 'error');
          } else if (result === 'No permission') {
            showMessage('Nincs jogosultságod törölni!', 'error');
          } else if (result === 'Invalid login') {
            showMessage('Érvénytelen bejelentkezés!', 'error');
            logout();
          } else {
            showMessage('Az autó nem található', 'warning');
          }
        })
        .withFailureHandler(error => {
          showMessage('Hiba történt a törlés során: ' + error.message, 'error');
        })
        .deleteCar(model, currentUser.username, currentUser.password);
    } catch (error) {
      console.error('deleteCar hiba:', error);
      showMessage('Hiba történt a törlés során', 'error');
    }
  }

  function addTag() {
    try {
      if (!currentUser) {
        showTagMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      const newTag = document.getElementById('newTag').value.trim();
      if (!newTag) {
        showTagMessage('Írj be egy tag nevet!', 'warning');
        return;
      }

      google.script.run.withSuccessHandler((result) => {
        if (result === 'OK') {
          showTagMessage('Tag hozzáadva!');
          document.getElementById('newTag').value = '';
          loadTags();
          loadTagOptions();
          loadStats();
        } else if (result === 'Invalid login') {
          showTagMessage('Érvénytelen bejelentkezés!', 'error');
          logout();
        }
      }).withFailureHandler(error => {
        showTagMessage('Hiba: ' + error.message, 'error');
      }).addTag(newTag, currentUser.username, currentUser.password);
    } catch (error) {
      console.error('addTag hiba:', error);
      showTagMessage('Hiba történt a tag hozzáadása során', 'error');
    }
  }

  function deleteTag(tagName) {
    try {
      if (!currentUser) {
        showTagMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      google.script.run.withSuccessHandler((result) => {
        if (result === 'Deleted') {
          showTagMessage('Tag törölve!');
          loadTags();
          loadTagOptions();
          loadStats();
        } else if (result === 'Invalid login') {
          showTagMessage('Érvénytelen bejelentkezés!', 'error');
          logout();
        }
      }).withFailureHandler(error => {
        showTagMessage('Hiba: ' + error.message, 'error');
      }).deleteTag(tagName, currentUser.username, currentUser.password);
    } catch (error) {
      console.error('deleteTag hiba:', error);
      showTagMessage('Hiba történt a tag törlése során', 'error');
    }
  }

  // ===== RANG FRISSÍTÉS =====
  function updateTagRank(tagName, newRank) {
    try {
      if (!currentUser) {
        showTagMessage('Bejelentkezés szükséges!', 'warning');
        return;
      }

      if (currentUser.role !== 'admin') {
        showTagMessage('Csak admin módosíthat rangot!', 'error');
        return;
      }

      google.script.run.withSuccessHandler((result) => {
        if (result === 'Updated') {
          showTagMessage('Rang frissítve!');
          loadTags();
        } else if (result === 'No permission') {
          showTagMessage('Nincs jogosultságod!', 'error');
        } else if (result === 'Invalid login') {
          showTagMessage('Érvénytelen bejelentkezés!', 'error');
          logout();
        } else {
          showTagMessage('Tag nem található', 'warning');
        }
      }).withFailureHandler(error => {
        showTagMessage('Hiba: ' + error.message, 'error');
      }).updateTagRank(tagName, newRank, currentUser.username, currentUser.password);
    } catch (error) {
      console.error('updateTagRank hiba:', error);
      showTagMessage('Hiba történt a rang frissítése során', 'error');
    }
  }

  function clearInputs() {
    try {
      document.getElementById('modelSearch').value = '';
      document.getElementById('vetel').value = '';
      document.getElementById('kivant').value = '';
      document.getElementById('eladas').value = '';
      document.getElementById('newTag').value = '';
      document.querySelectorAll('.tuning-option').forEach(div => div.classList.remove('selected'));
      document.getElementById('modelDropdown').style.display = 'none';
      clearImage(); // KÉP IS TISZTÍTÁSA
    } catch (error) {
      console.error('clearInputs hiba:', error);
    }
  }

  // Kattintás a dropdown-on kívül
  document.addEventListener('click', function(event) {
    try {
      const modelDropdown = document.getElementById('modelDropdown');
      const modelSearch = document.getElementById('modelSearch');
      
      if (modelSearch && modelDropdown && !modelSearch.contains(event.target) && !modelDropdown.contains(event.target)) {
        modelDropdown.style.display = 'none';
      }
    } catch (error) {
      console.error('Dropdown click handler hiba:', error);
    }
  });

  // ===== OLDAL BETÖLTÉSE =====
  window.onload = () => {
    try {
      loadAllData();
      showPage('autok');
    } catch (error) {
      console.error('Window load hiba:', error);
      showMessage('Hiba történt az oldal betöltésekor', 'error');
    }
  };

  // Global error handler
  window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showMessage('Váratlan hiba történt', 'error');
  });
</script>
