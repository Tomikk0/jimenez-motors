(function(global) {
  'use strict';

  class SupabaseLikeClient {
    constructor(apiBaseUrl) {
      this.apiBaseUrl = apiBaseUrl;
    }

    from(table) {
      return new SupabaseLikeQuery(this, table);
    }

    async request(action, table, payload) {
      try {
        const response = await fetch(this.apiBaseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action,
            table,
            ...payload
          })
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          const errorMessage = result.error || result.message || 'Ismeretlen hiba történt az adatbázis kérés során.';
          console.error('Database request error:', errorMessage, result.details || '');
          return { data: null, error: errorMessage };
        }

        return { data: typeof result.data === 'undefined' ? null : result.data, error: null };
      } catch (error) {
        console.error('Database request failed:', error);
        return { data: null, error: error.message || 'Hálózati hiba történt az adatbázis elérésekor.' };
      }
    }
  }

  class SupabaseLikeQuery {
    constructor(client, table) {
      this.client = client;
      this.table = table;
      this.reset();
    }

    reset() {
      this.action = 'select';
      this.columns = '*';
      this.filters = [];
      this.ordering = null;
      this.limitValue = null;
      this.offsetValue = null;
      this.singleValue = false;
      this.payloadData = null;
      this.returningColumns = null;
    }

    select(columns = '*') {
      if (this.action === 'insert' || this.action === 'update' || this.action === 'delete') {
        this.returningColumns = columns;
        return this;
      }

      this.action = 'select';
      this.columns = columns;
      return this;
    }

    insert(values) {
      this.action = 'insert';
      this.payloadData = Array.isArray(values) ? values : [values];
      return this;
    }

    update(values) {
      this.action = 'update';
      this.payloadData = values || {};
      return this;
    }

    delete() {
      this.action = 'delete';
      this.payloadData = null;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, operator: 'eq', value });
      return this;
    }

    order(column, options = {}) {
      this.ordering = {
        column,
        ascending: options.ascending !== false
      };
      return this;
    }

    limit(value) {
      this.limitValue = value;
      return this;
    }

    range(from, to) {
      this.offsetValue = from;
      this.limitValue = typeof to === 'number' && typeof from === 'number'
        ? (to - from + 1)
        : null;
      return this;
    }

    single() {
      this.singleValue = true;
      return this;
    }

    async execute() {
      const payload = {
        columns: this.columns,
        filters: this.filters,
        order: this.ordering,
        limit: this.limitValue,
        offset: this.offsetValue,
        single: this.singleValue,
        data: this.payloadData,
        returning: this.returningColumns
      };

      try {
        const result = await this.client.request(this.action, this.table, payload);
        return result;
      } finally {
        this.reset();
      }
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(onRejected) {
      return this.execute().catch(onRejected);
    }
  }

  function createDatabaseClient(apiBaseUrl) {
    return new SupabaseLikeClient(apiBaseUrl);
  }

  global.createDatabaseClient = createDatabaseClient;
})(window);
