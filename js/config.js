// === SUPABASE KAPCSOLAT === 
const supabase = window.supabase.createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);

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
