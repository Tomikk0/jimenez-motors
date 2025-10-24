// === SUPABASE KAPCSOLAT === 
const supabaseUrl = 'https://abpmluenermqghrrtjhq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFicG1sdWVuZXJtcWdocnJ0amhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MTYzMjgsImV4cCI6MjA3NjI5MjMyOH0.YkTZME_BB86r3mM8AyNYu-2yaMdh4LtDhHbynvdkaKA';
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