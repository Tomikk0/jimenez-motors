const NEWS_DATE_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
};

let newsItems = [];
let newsLoaded = false;
let newsLoadingPromise = null;
let addNewsModalEscHandler = null;

function transformNewsRow(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const createdAt = row.created_at ? new Date(row.created_at) : null;
  return {
    id: typeof row.id === 'number' ? row.id : (row.id ? parseInt(row.id, 10) : null),
    title: row.title ? String(row.title) : '',
    content: row.content ? String(row.content) : '',
    created_by: row.created_by ? String(row.created_by) : '',
    created_at: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : null
  };
}

function setNews(rows) {
  const prepared = Array.isArray(rows)
    ? rows.map(transformNewsRow).filter(Boolean)
    : [];

  newsItems = prepared;
  newsLoaded = true;
  renderNews(newsItems);
  return newsItems;
}

function formatNewsDate(value) {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  try {
    return date.toLocaleString('hu-HU', NEWS_DATE_OPTIONS);
  } catch (error) {
    console.warn('News date format error:', error);
    return date.toISOString();
  }
}

function renderNews(list) {
  const container = document.getElementById('newsList');
  if (!container) {
    return;
  }

  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<div class="news-empty">Nincsenek friss hírek</div>';
    return;
  }

  const fragment = document.createDocumentFragment();

  list.forEach(item => {
    const safeTitle = escapeHtml(item.title || '');
    const safeContent = escapeHtml(item.content || '').replace(/\n/g, '<br>');
    const metaParts = [];

    if (item.created_by) {
      metaParts.push(`👤 ${escapeHtml(item.created_by)}`);
    }

    const formattedDate = formatNewsDate(item.created_at);
    if (formattedDate) {
      metaParts.push(`🗓️ ${escapeHtml(formattedDate)}`);
    }

    const newsArticle = document.createElement('article');
    newsArticle.className = 'news-card';
    const metaMarkup = metaParts.length
      ? `<footer class="news-card-meta">${metaParts.map(part => `<span>${part}</span>`).join('')}</footer>`
      : '';

    newsArticle.innerHTML = `
      <h4 class="news-card-title">${safeTitle}</h4>
      <div class="news-card-content">${safeContent}</div>
      ${metaMarkup}
    `;

    fragment.appendChild(newsArticle);
  });

  container.innerHTML = '';
  container.appendChild(fragment);
}

async function loadNews(force = false) {
  const container = document.getElementById('newsList');

  if (!force) {
    if (newsLoadingPromise) {
      return newsLoadingPromise;
    }

    if (newsLoaded) {
      renderNews(newsItems);
      return Promise.resolve(newsItems);
    }
  } else {
    newsLoaded = false;
  }

  if (container) {
    container.innerHTML = '<div class="news-loading">Hírek betöltése...</div>';
  }

  const fetchPromise = (async () => {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, content, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return setNews(Array.isArray(data) ? data : []);
  })();

  const handledPromise = fetchPromise.catch(error => {
    newsLoaded = false;
    console.error('News load error:', error);
    showMessage('Hiba történt a hírek betöltésekor', 'error', 'newsMessage');
    throw error;
  }).finally(() => {
    newsLoadingPromise = null;
  });

  newsLoadingPromise = handledPromise;
  return handledPromise;
}

function resetNewsForm() {
  const titleInput = document.getElementById('newsTitle');
  const contentInput = document.getElementById('newsContent');
  const messageEl = document.getElementById('newsFormMessage');

  if (titleInput) {
    titleInput.value = '';
  }

  if (contentInput) {
    contentInput.value = '';
  }

  if (messageEl) {
    messageEl.style.display = 'none';
    messageEl.textContent = '';
    messageEl.className = 'message';
  }
}

function openAddNewsModal() {
  try {
    if (!isAdmin()) {
      showMessage('Csak adminok adhatnak hozzá híreket!', 'error', 'newsMessage');
      return;
    }

    resetNewsForm();

    const modal = document.getElementById('addNewsModal');
    if (!modal) return;

    modal.style.display = 'block';
    modal.classList.add('active');

    setTimeout(() => {
      const titleInput = document.getElementById('newsTitle');
      if (titleInput) {
        titleInput.focus();
      }
    }, 120);

    if (!addNewsModalEscHandler) {
      addNewsModalEscHandler = event => {
        if (event.key === 'Escape') {
          closeAddNewsModal();
        }
      };
    }

    document.addEventListener('keydown', addNewsModalEscHandler);
  } catch (error) {
    console.error('openAddNewsModal error:', error);
  }
}

function closeAddNewsModal() {
  try {
    const modal = document.getElementById('addNewsModal');
    if (!modal) return;

    modal.classList.remove('active');
    modal.style.display = 'none';

    if (addNewsModalEscHandler) {
      document.removeEventListener('keydown', addNewsModalEscHandler);
      addNewsModalEscHandler = null;
    }
  } catch (error) {
    console.error('closeAddNewsModal error:', error);
  }
}

async function submitNews(event) {
  event.preventDefault();

  if (!isAdmin()) {
    showMessage('Csak adminok adhatnak hozzá híreket!', 'error', 'newsFormMessage');
    return;
  }

  const titleInput = document.getElementById('newsTitle');
  const contentInput = document.getElementById('newsContent');
  const submitBtn = document.getElementById('newsSubmitButton');

  const title = titleInput ? titleInput.value.trim() : '';
  const content = contentInput ? contentInput.value.trim() : '';

  if (!title || !content) {
    showMessage('Kérjük, töltsd ki a címet és a leírást is!', 'warning', 'newsFormMessage');
    return;
  }

  if (content.length > 2000) {
    showMessage('A leírás túl hosszú! Legfeljebb 2000 karakter lehet.', 'warning', 'newsFormMessage');
    return;
  }

  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mentés...';
  }

  try {
    const payload = {
      title,
      content,
      created_by: currentUser?.tagName || currentUser?.username || null
    };

    const { data, error } = await supabase
      .from('news')
      .insert(payload)
      .select('id, title, content, created_by, created_at')
      .single();

    if (error) {
      throw error;
    }

    const prepared = transformNewsRow(data);
    if (prepared) {
      newsItems = [prepared, ...newsItems];
      renderNews(newsItems);
      newsLoaded = true;
    }

    showMessage('Új hír sikeresen hozzáadva!', 'success', 'newsMessage');
    closeAddNewsModal();
  } catch (error) {
    console.error('submitNews error:', error);
    showMessage('Hiba történt a hír mentésekor', 'error', 'newsFormMessage');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText || 'Hír mentése';
    }
  }
}

function updateNewsAdminControls() {
  const addButton = document.getElementById('addNewsButton');
  if (!addButton) {
    return;
  }

  addButton.style.display = isAdmin() ? 'inline-flex' : 'none';
}

window.setNews = setNews;
window.loadNews = loadNews;
window.openAddNewsModal = openAddNewsModal;
window.closeAddNewsModal = closeAddNewsModal;
window.submitNews = submitNews;
window.updateNewsAdminControls = updateNewsAdminControls;