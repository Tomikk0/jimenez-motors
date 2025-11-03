// Lightweight client that mimics the Supabase query builder API but
// delegates the actual work to the local PHP backend.
(function(global) {
  const API_BASE_URL = 'api';

  function createClient(baseUrl) {
    function from(table) {
      const state = {
        table,
        type: 'select',
        select: '*',
        filters: [],
        order: null,
        limit: null,
        data: null,
        returning: false,
        single: false
      };

      const query = {
        select(columns = '*') {
          if (state.type === 'insert' || state.type === 'update') {
            state.returning = true;
          } else {
            state.type = 'select';
          }
          state.select = columns;
          return query;
        },
        insert(data) {
          state.type = 'insert';
          state.data = data;
          return query;
        },
        update(values) {
          state.type = 'update';
          state.data = values;
          return query;
        },
        delete() {
          state.type = 'delete';
          return query;
        },
        eq(column, value) {
          state.filters.push({ column, operator: 'eq', value });
          return query;
        },
        order(column, options = {}) {
          state.order = { column, ascending: options.ascending !== false };
          return query;
        },
        limit(count) {
          const parsed = Number.parseInt(count, 10);
          state.limit = Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
          return query;
        },
        single() {
          state.single = true;
          return query;
        },
        then(resolve, reject) {
          return execute().then(resolve, reject);
        },
        catch(reject) {
          return execute().catch(reject);
        },
        finally(handler) {
          return execute().finally(handler);
        }
      };

      async function execute() {
        try {
          const response = await fetch(`${baseUrl}/query.php`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              table: state.table,
              type: state.type,
              select: state.select,
              filters: state.filters,
              order: state.order,
              limit: state.limit,
              data: state.data,
              returning: state.returning,
              single: state.single
            })
          });

          const payload = await response.json();

          if (!response.ok || payload.error) {
            return {
              data: null,
              error: payload.error || { message: 'Unknown server error' }
            };
          }

          return {
            data: payload.data,
            error: null
          };
        } catch (error) {
          return {
            data: null,
            error: { message: error.message || 'Network error' }
          };
        }
      }

      return query;
    }

    return { from };
  }

  global.createLocalClient = createClient;
  global.apiClient = createClient(API_BASE_URL);
})(window);
