// === AUTÓK OLDAL ENTER KEZELÉSE ===
function handleCarsEnter(target) {
    const modelSearch = document.getElementById('modelSearch');
    const vetelInput = document.getElementById('vetel');
    const kivantInput = document.getElementById('kivant');
    const eladasInput = document.getElementById('eladas');
    
    if (target === modelSearch) {
        vetelInput?.focus();
    } else if (target === vetelInput) {
        kivantInput?.focus();
    } else if (target === kivantInput) {
        eladasInput?.focus();
    } else if (target === eladasInput) {
        addCar(); // Automatikus hozzáadás
    }
}

// === GALÉRIA OLDAL ENTER KEZELÉSE ===
function handleGalleryEnter(target) {
    const modelSearch = document.getElementById('galleryModelSearch');
    const basePriceInput = document.getElementById('galleryBasePrice');
    const priceInput = document.getElementById('galleryPrice');
    
    if (target === modelSearch) {
        basePriceInput?.focus();
    } else if (target === basePriceInput) {
        priceInput?.focus();
    } else if (target === priceInput) {
        addGalleryCar(); // Automatikus hozzáadás
    }
}

// === TUNING OK OLDAL ENTER KEZELÉSE ===
function handleTuningEnter(target) {
    const nameInput = document.getElementById('tuningName');
    const ppPriceInput = document.getElementById('tuningPPPrice');
    const priceInput = document.getElementById('tuningPrice');
    
    if (target === nameInput) {
        ppPriceInput?.focus();
    } else if (target === ppPriceInput) {
        priceInput?.focus();
    } else if (target === priceInput) {
        addTuning(); // Automatikus hozzáadás
    }
}

// === TAGOK OLDAL ENTER KEZELÉSE ===
function handleTagsEnter(target) {
    const newTagInput = document.getElementById('newTag');
    
    if (target === newTagInput) {
        addTag(); // Automatikus hozzáadás
    }
}

// === TAG ADMIN OLDAL ENTER KEZELÉSE ===
function handleTagAdminEnter(target) {
    const newTagName = document.getElementById('newTagName');
    const newUsername = document.getElementById('newUsername');
    const newTagRank = document.getElementById('newTagRank');
    const newUserRole = document.getElementById('newUserRole');
    const newTagPhone = document.getElementById('newTagPhone');
    const customPassword = document.getElementById('customPassword');
    
    // Sorrendben fókuszálás
    if (target === newTagName) {
        newUsername?.focus();
    } else if (target === newUsername) {
        newTagRank?.focus();
    } else if (target === newTagRank) {
        newUserRole?.focus();
    } else if (target === newUserRole) {
        newTagPhone?.focus();
    } else if (target === newTagPhone) {
        customPassword?.focus();
    } else if (target === customPassword) {
        addTagWithAccount(); // Automatikus hozzáadás
    }
}

// === BEJELENTKEZÉS OLDAL ENTER KEZELÉSE ===
function handleLoginEnter() {
    login(); // Automatikus bejelentkezés
}

// === ÁLTALÁNOS ŰRLAP KEZELÉS ===
function handleGenericFormEnter(form) {
    // Megpróbáljuk megtalálni a submit gombot
    const submitBtn = form.querySelector('button[type="submit"], .modern-btn-primary, .modern-btn-success');
    
    if (submitBtn) {
        submitBtn.click();
    } else {
        console.log('Nincs submit gomb található az űrlapban');
    }
}
// === ENTER BILLENTYŰ KEZELÉSE MINDEN ŰRLAPON ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Enter billentyű kezelő inicializálása...');
    
    // Automatikus Enter kezelés minden input mezőre
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            const target = event.target;
            
            // Ne aktiváljuk, ha textarea vagy speciális input
            if (target.tagName === 'TEXTAREA') return;
            if (target.type === 'password' && target.id !== 'currentPassword') return;
            
            console.log('Enter lenyomva:', target.id);
            
            // Keresés a legközelebbi űrlaphoz
            const form = target.closest('form') || target.closest('.form-container') || target.closest('.modal-content');
            
            if (form) {
                event.preventDefault();
                
                // Meghatározzuk, melyik űrlapról van szó
                handleEnterKey(target, form);
            }
        }
    });
    
    // Speciális eset: jelszó mezők a modális ablakokban
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    passwordInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePasswordEnter(input);
            }
        });
    });
});

// Enter billentyű kezelése input mezőkben
function handleEnterKey(target, form) {
    const formId = form.id || '';
    const page = getCurrentPage();
    
    console.log('Enter kezelése:', { targetId: target.id, formId: formId, page: page });
    
    switch(page) {
        case 'autok':
            handleCarsEnter(target);
            break;
        case 'autokKepek':
            handleGalleryEnter(target);
            break;
        case 'tuningok':
            handleTuningEnter(target);
            break;
        case 'tagok':
            handleTagsEnter(target);
            break;
        case 'tagAdmin':
            handleTagAdminEnter(target);
            break;
        case 'login':
            handleLoginEnter();
            break;
        default:
            // Általános űrlap kezelés
            handleGenericFormEnter(form);
    }
}

// Jelszó mezők Enter kezelése
function handlePasswordEnter(input) {
    const modal = input.closest('.modal');
    if (!modal) return;
    
    const modalId = modal.id;
    console.log('Jelszó Enter:', modalId);
    
    switch(modalId) {
        case 'changePasswordModal':
            changePassword();
            break;
        case 'changePasswordForUserModal':
            changePasswordForUser();
            break;
        default:
            // Alapértelmezett: submit
            const form = input.closest('form');
            if (form) form.dispatchEvent(new Event('submit'));
    }
}

// Aktuális oldal meghatározása
function getCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return '';
    
    return activePage.id.replace('Page', '');
}