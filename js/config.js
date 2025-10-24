// === SUPABASE KAPCSOLAT DINAMIKUS KONFIGGAL ===
function loadSupabaseConfig() {
  try {
    var request = new XMLHttpRequest();
    request.open('GET', '/api/config', false);
    request.send(null);

    if (request.status >= 200 && request.status < 300) {
      var responseText = request.responseText || '{}';
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Supabase konfiguráció JSON parse hiba:', parseError);
        return null;
      }
    }

    console.error('❌ Supabase konfiguráció lekérése sikertelen:', request.status, request.statusText);
  } catch (error) {
    console.error('❌ Supabase konfiguráció lekérése közben hiba történt:', error);
  }
  return null;
}

const __supabaseConfig = loadSupabaseConfig() || {};
const supabaseUrl = typeof __supabaseConfig.supabaseUrl === 'string' ? __supabaseConfig.supabaseUrl : '';
const supabaseKey = typeof __supabaseConfig.supabaseKey === 'string' ? __supabaseConfig.supabaseKey : '';

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ A Supabase konfiguráció hiányos. Ellenőrizd az environment változókat!');
}

const supabase =
  window.supabase && typeof window.supabase.createClient === 'function' && supabaseUrl && supabaseKey
    ? window.supabase.createClient(supabaseUrl, supabaseKey)
    : null;

if (supabase) {
  window.supabaseClient = supabase;
  window.__SUPABASE_CONFIG__ = Object.freeze({ supabaseUrl, supabaseKey });
  console.log('✅ Supabase kliens inicializálva dinamikus konfigurációval.');
} else {
  console.error('❌ Nem sikerült inicializálni a Supabase klienst.');
}

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