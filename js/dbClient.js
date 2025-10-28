(function(window) {
  class MariaDBQueryBuilder {
    constructor(client, table) {
      this.client = client;
      this.table = table;
      this.operation = null;
      this.columns = '*';
      this.filters = [];
      this.orderBy = [];
      this.payload = null;
      this.singleResult = false;
      this.returning = false;
      this.limitValue = undefined;
    }

    select(columns = '*') {
      if (this.operation === 'insert' || this.operation === 'update') {
        this.returning = true;
        this.columns = columns || '*';
        return this;
      }
      this.operation = 'select';
      this.columns = columns || '*';
      return this;
    }

    insert(data) {
      this.operation = 'insert';
      this.payload = data;
      return this;
    }

    update(data) {
      this.operation = 'update';
      this.payload = data;
      return this;
    }

    delete() {
      this.operation = 'delete';
      return this;
    }

    eq(column, value) {
      this.filters.push({ operator: 'eq', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orderBy.push({ column, ascending: options.ascending !== false });
      return this;
    }

    single() {
      this.singleResult = true;
      return this;
    }

    limit(count) {
      this.limitValue = count;
      return this;
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }

    catch(reject) {
      return this.execute().catch(reject);
    }

    async execute() {
      if (!this.operation) {
        throw new Error('No database operation specified');
      }

      try {
        const response = await this.client.execute({
          table: this.table,
          operation: this.operation,
          data: this.payload,
          columns: this.columns,
          filters: this.filters,
          order: this.orderBy,
          single: this.singleResult,
          returning: this.returning,
          limit: this.limitValue
        });
        return response;
      } catch (error) {
        return { data: null, error: { message: error.message } };
      }
    }
  }

  class MariaDBClient {
    constructor(baseUrl) {
      this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    from(table) {
      return new MariaDBQueryBuilder(this, table);
    }

    async execute(payload) {
      const url = `${this.baseUrl}/query`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let body;
      try {
        body = await response.json();
      } catch (error) {
        body = { data: null, error: { message: 'Invalid server response' } };
      }

      if (!response.ok) {
        const message = body?.error?.message || response.statusText || 'Unknown error';
        return { data: null, error: { message } };
      }

      return {
        data: body.data,
        error: body.error || null
      };
    }
  }

  window.MariaDBClient = MariaDBClient;
})(window);
