// === ADATBÁZIS KONFIGURÁCIÓ ===
const databaseConfig = {
  apiBaseUrl: '/api/index.php',
  imageBaseUrl: '/uploads'
};

const supabase = createDatabaseClient(databaseConfig.apiBaseUrl);
window.supabase = supabase;
window.databaseConfig = databaseConfig;

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
