// === MYSQL ALAPÚ ADATKAPCSOLAT ===
const apiBaseUrl = window.__API_BASE_URL__ || `${window.location.origin}/api`;
const storageBaseUrl = window.__STORAGE_BASE_URL__ || '';
const supabase = createMySQLClient(apiBaseUrl);

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
