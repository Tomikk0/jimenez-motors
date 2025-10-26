// === API KAPCSOLAT ===
// Állítsd be a backend API elérhetőségét. Ha szeretnéd felülírni futásidőben,
// adj meg egy window.API_BASE_URL változót az oldal betöltése előtt.
const API_BASE_URL = (window.API_BASE_URL || 'http://localhost:8787/api').replace(/\/$/, '');
const supabase = window.createApiClient(API_BASE_URL);

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
