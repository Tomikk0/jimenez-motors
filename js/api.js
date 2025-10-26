(function () {
  const DEFAULT_TIMEOUT = 15000;

  function normalizeBaseUrl(baseUrl) {
    if (!baseUrl) {
      throw new Error('API base URL is required');
    }
    return baseUrl.replace(/\/$/, '');
  }

  function sanitizeValue(value) {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return value;
  }

  class QueryBuilder {
    constructor(baseUrl, table) {
      this.baseUrl = baseUrl;
      this.table = table;
      this.method = 'GET';
      this.body = null;
      this.columns = '*';
      this.filters = [];
      this.ordering = [];
      this.expectSingle = false;
      this.returnRepresentation = false;
    }

    select(columns = '*') {
      if (this.method === 'GET') {
        this.columns = columns;
      } else {
        this.returnRepresentation = true;
      }
      return this;
    }

    insert(values) {
      this.method = 'POST';
      this.body = Array.isArray(values) ? values : [values];
      return this;
    }

    update(values) {
      this.method = 'PATCH';
      this.body = values || {};
      return this;
    }

    delete() {
      this.method = 'DELETE';
      this.body = null;
      return this;
    }

    eq(column, value) {
      this.filters.push({ column, value });
      return this;
    }

    order(column, options = {}) {
      const ascending = options.ascending !== false;
      this.ordering.push({ column, ascending });
      return this;
    }

    single() {
      this.expectSingle = true;
      return this;
    }

    async execute() {
      try {
        const url = new URL(`${this.baseUrl}/${encodeURIComponent(this.table)}`);

        if (this.method === 'GET' && this.columns && this.columns !== '*') {
          url.searchParams.set('columns', this.columns);
        }

        this.filters.forEach(filter => {
          url.searchParams.append(`eq_${filter.column}`, sanitizeValue(filter.value));
        });

        this.ordering.forEach(order => {
          url.searchParams.append('order', `${order.column}.${order.ascending ? 'asc' : 'desc'}`);
        });

        if (this.expectSingle) {
          url.searchParams.set('single', 'true');
        }

        if (this.returnRepresentation) {
          url.searchParams.set('returning', 'representation');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

        const options = {
          method: this.method,
          headers: {},
          signal: controller.signal
        };

        if (this.method !== 'GET' && this.method !== 'DELETE') {
          options.headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(this.body);
        }

        const response = await fetch(url.toString(), options);
        clearTimeout(timeoutId);

        let payload = null;
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          payload = await response.json();
        } else {
          const text = await response.text();
          payload = text ? { message: text } : null;
        }

        if (!response.ok) {
          const message = payload?.message || payload?.error || `HTTP ${response.status}`;
          return {
            data: null,
            error: {
              message,
              status: response.status,
              details: payload?.detail || payload?.details || null
            }
          };
        }

        const data = payload ?? null;

        if (this.expectSingle) {
          if (Array.isArray(data)) {
            if (data.length === 0) {
              return { data: null, error: { message: 'No rows returned', status: 404 } };
            }
            if (data.length > 1) {
              return { data: null, error: { message: 'Multiple rows returned', status: 400 } };
            }
            return { data: data[0], error: null };
          }
          return { data, error: null };
        }

        return { data, error: null };
      } catch (error) {
        if (error.name === 'AbortError') {
          return { data: null, error: { message: 'Request timed out', status: 408 } };
        }
        return { data: null, error: { message: error.message || 'Network error' } };
      }
    }

    then(onFulfilled, onRejected) {
      return this.execute().then(onFulfilled, onRejected);
    }

    catch(onRejected) {
      return this.execute().catch(onRejected);
    }

    finally(onFinally) {
      return this.execute().finally(onFinally);
    }
  }

  function createApiClient(baseUrl) {
    const normalizedBase = normalizeBaseUrl(baseUrl);
    return {
      from(table) {
        if (!table || typeof table !== 'string') {
          throw new Error('Table name must be a non-empty string');
        }
        return new QueryBuilder(normalizedBase, table);
      }
    };
  }

  window.createApiClient = createApiClient;
})();
