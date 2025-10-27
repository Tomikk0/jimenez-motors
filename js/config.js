// === NEON ADATBÁZIS KAPCSOLAT ===
// A kliens az összes modul számára egy Supabase-kompatibilis interfészt biztosít,
// de a kéréseket a Vercel szerverless API-n keresztül a Neon PostgreSQL
// adatbázis felé továbbítja.

const NEON_API_ENDPOINT = '/api/neon-query';

// Ha továbbra is a Supabase tárhelyet használod a képekhez, akkor add meg a publikus
// tárhely URL-jét itt. Ezt a `utils.js` használja a képek eléréséhez.
// Példa: const storageBaseUrl = 'https://your-project.supabase.co';
const storageBaseUrl = 'https://abpmluenermqghrrtjhq.supabase.co';

const supabase = createNeonCompatClient(NEON_API_ENDPOINT);

function createNeonCompatClient(apiEndpoint) {
  return {
    from(table) {
      return new NeonQueryBuilder(apiEndpoint, table);
    }
  };
}

class NeonQueryBuilder {
  constructor(apiEndpoint, table) {
    this.apiEndpoint = apiEndpoint;
    this.table = table;
    this.action = null;
    this.columns = '*';
    this.payload = null;
    this.filters = [];
    this.orders = [];
    this.expect = 'many';
    this.executionPromise = null;
  }

  select(columns = '*') {
    this.action = 'select';
    this.columns = columns;
    return this;
  }

  insert(values) {
    this.action = 'insert';
    this.payload = Array.isArray(values) ? values : [values];
    return this._execute();
  }

  update(values) {
    this.action = 'update';
    this.payload = values || {};
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push({ operator: 'eq', column, value });
    return this;
  }

  order(column, options = {}) {
    this.orders.push({ column, ascending: options.ascending !== false });
    return this;
  }

  single() {
    this.expect = 'single';
    return this;
  }

  maybeSingle() {
    this.expect = 'maybeSingle';
    return this;
  }

  then(onFulfilled, onRejected) {
    return this._execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this._execute().catch(onRejected);
  }

  finally(onFinally) {
    return this._execute().finally(onFinally);
  }

  _execute() {
    if (!this.executionPromise) {
      this.executionPromise = this._run();
    }
    return this.executionPromise;
  }

  async _run() {
    if (!this.action) {
      return { data: null, error: { message: 'Nincs megadva művelet a lekérdezéshez.' } };
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          payload: this.payload,
          filters: this.filters,
          orders: this.orders,
          expect: this.expect
        })
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result) {
        const message = result?.error?.message || response.statusText || 'Ismeretlen hiba történt.';
        return { data: null, error: { message } };
      }

      return result;
    } catch (error) {
      console.error('Neon lekérdezés hiba:', error);
      return { data: null, error: { message: error.message || 'Hálózati hiba történt.' } };
    }
  }
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
