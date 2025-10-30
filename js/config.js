// === HELYI API KAPCSOLAT ===
const API_BASE_URL = 'api';
// A `supabase` változó visszafelé kompatibilis alias; valójában a PHP + MariaDB API-t hívja.
const supabase = window.apiClient || window.createLocalClient(API_BASE_URL);
window.dbClient = supabase;
window.API_BASE_URL = API_BASE_URL;

// Globális változók
let tuningOptions = [];
let modelOptions = [];
let tagOptions = [];
let tagOptionMap = new Map();
let allCars = [];
let carsLoaded = false;
let carsLoadingPromise = null;
let currentUser = null;
let searchTimeout;
let selectedImage = null;
let currentCarIdForSale = null;
let currentKickMemberName = null;
let gallerySelectedImage = null;

function updateTagCaches(list) {
  if (!Array.isArray(list)) {
    tagOptions = [];
    tagOptionMap = new Map();
  } else {
    tagOptions = list.slice();
    tagOptionMap = new Map(tagOptions.map(tag => [tag.name, tag]));
  }

  if (typeof renderCars === 'function' && Array.isArray(allCars) && allCars.length > 0) {
    try {
      renderCars(allCars);
    } catch (error) {
      console.error('renderCars frissítés hiba:', error);
    }
  }
}

window.updateTagCaches = updateTagCaches;
