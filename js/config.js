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
let allCars = [];
let currentUser = null;
let searchTimeout;
let selectedImage = null;
let currentCarIdForSale = null;
let currentKickMemberName = null;
let gallerySelectedImage = null;
