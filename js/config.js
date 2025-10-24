// config.js
const supabaseUrl = window.__SUPABASE_URL__;
const supabaseKey = window.__SUPABASE_KEY__;
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);


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

