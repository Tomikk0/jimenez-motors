// === MARIA DB KAPCSOLAT ===
const apiBaseUrl = (window.APP_CONFIG && window.APP_CONFIG.apiBaseUrl) || '/api';
const supabase = new MariaDBClient(apiBaseUrl);

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
