(function(global) {
  class MySQLClient {
    constructor(baseUrl) {
      this.baseUrl = (baseUrl || '').replace(/\/$/, '');
    }

    from(table) {
      return new MySQLQueryBuilder(this, table);
    }

    async _post(payload) {
      try {
        const response = await fetch(`${this.baseUrl}/query.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const json = await response.json().catch(() => ({ data: null, error: { message: 'Invalid JSON response' } }));

        if (!response.ok) {
          return { data: null, error: json.error || { message: 'Unknown error' } };
        }

        return json;
      } catch (error) {
        console.error('MySQL client request failed:', error);
        return { data: null, error: { message: error.message || 'Network error' } };
      }
    }
  }

  class MySQLQueryBuilder {
    constructor(client, table) {
      this.client = client;
      this.table = table;
      this.action = null;
      this.columns = '*';
      this.filters = [];
      this.orderRules = [];
      this.limitValue = null;
      this.offsetValue = null;
      this.singleRow = false;
      this.payloadData = null;
      this.returning = null;
      this._promise = null;
    }

    select(columns = '*') {
      this.action = 'select';
      this.columns = columns || '*';
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
      this.filters.push({ type: 'eq', column, value });
      return this;
    }

    order(column, options = {}) {
      this.orderRules.push({ column, ascending: options.ascending !== false });
      return this;
    }

    limit(count) {
      this.limitValue = count;
      return this;
    }

    single() {
      this.singleRow = true;
      return this;
    }

    then(onFulfilled, onRejected) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.then(onFulfilled, onRejected);
    }

    catch(onRejected) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.catch(onRejected);
    }

    finally(onFinally) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.finally(onFinally);
    }

    _execute() {
      if (!this.action) {
        return Promise.resolve({ data: null, error: { message: 'No query action specified' } });
      }

      const payload = {
        table: this.table,
        action: this.action,
        columns: this.columns,
        filters: this.filters,
        order: this.orderRules,
        limit: this.limitValue,
        offset: this.offsetValue,
        single: this.singleRow,
        data: this.payloadData,
        returning: this.returning
      };

      return this.client._post(payload).finally(() => {
        this._promise = null;
      });
    }
  }

  class MySQLInsertQuery {
    constructor(client, table, data) {
      this.client = client;
      this.table = table;
      this.data = Array.isArray(data) ? data : [data];
      this._promise = null;
    }

    select(columns = '*') {
      return this._execute(columns);
    }

    then(onFulfilled, onRejected) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.then(onFulfilled, onRejected);
    }

    catch(onRejected) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.catch(onRejected);
    }

    finally(onFinally) {
      if (!this._promise) {
        this._promise = this._execute();
      }
      return this._promise.finally(onFinally);
    }

    _execute(returning) {
      const payload = {
        table: this.table,
        action: 'insert',
        data: this.data
      };

      if (returning) {
        payload.returning = returning;
      }

      const promise = this.client._post(payload);
      if (!returning) {
        this._promise = promise.finally(() => {
          this._promise = null;
        });
        return this._promise;
      }

      return promise;
    }
  }

  function createMySQLClient(baseUrl) {
    const client = new MySQLClient(baseUrl);

    return {
      from(table) {
        if (!table) {
          throw new Error('Table name is required');
        }

        return new Proxy(new MySQLQueryBuilder(client, table), {
          get(target, prop) {
            if (prop === 'insert') {
              return data => new MySQLInsertQuery(client, table, data);
            }

            return Reflect.get(target, prop);
          }
        });
      }
    };
  }

  global.createMySQLClient = createMySQLClient;
})(window);
