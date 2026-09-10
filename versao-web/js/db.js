/* ===================================================================
   CLARITY GLASS - PORTARIA - DB.JS
   ===================================================================
   Camada de acesso ao IndexedDB. Funções reutilizáveis para
   inserir, editar, excluir, pesquisar, exportar e importar dados.
   Cada módulo do sistema possui sua própria Store.
   =================================================================== */

const DB = (() => {
  const DB_NAME = 'clarityPortaria';
  const DB_VERSION = 4;

  // Esquema das Stores. Cada módulo tem a sua.
  const SCHEMA = {
    chaves: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' },
        { name: 'tipo', keyPath: 'tipo' }
      ]
    },
    visitantes: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' }
      ]
    },
    visitantes_perfil: {
      keyPath: 'id',
      indexes: [
        { name: 'nome', keyPath: 'nome' }
      ]
    },
    epis: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' }
      ]
    },
    avisos: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' }
      ]
    },
    ocorrencias: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' }
      ]
    },
    pessoas: {
      keyPath: 'id',
      indexes: [
        { name: 'nome', keyPath: 'nome' },
        { name: 'tipo', keyPath: 'tipo' },
        { name: 'documento', keyPath: 'documento' }
      ]
    },
    entradas_saidas: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' },
        { name: 'pessoaId', keyPath: 'pessoaId' },
        { name: 'status', keyPath: 'status' }
      ]
    },
    autorizacoes: {
      keyPath: 'id',
      indexes: [
        { name: 'data', keyPath: 'data' },
        { name: 'pessoaId', keyPath: 'pessoaId' },
        { name: 'responsavelId', keyPath: 'responsavelId' },
        { name: 'status', keyPath: 'status' }
      ]
    },
    config: {
      keyPath: 'id'
    }
  };

  let _dbPromise = null;

  /**
   * Abre (ou reutiliza) a conexão com o banco de dados.
   * @returns {Promise<IDBDatabase>}
   */
  function open() {
    if (!_dbPromise) {
      _dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        let timer;

        const fail = (err) => {
          _dbPromise = null;
          clearTimeout(timer);
          reject(err);
        };

        const onUpgrade = (event) => {
          const db = event.target.result;
          Object.keys(SCHEMA).forEach((name) => {
            const cfg = SCHEMA[name];
            if (!db.objectStoreNames.contains(name)) {
              const store = db.createObjectStore(name, { keyPath: cfg.keyPath });
              (cfg.indexes || []).forEach((idx) => {
                store.createIndex(idx.name, idx.keyPath, idx.options || {});
              });
            }
          });
        };

        req.onupgradeneeded = onUpgrade;

        req.onsuccess = () => {
          clearTimeout(timer);
          // Fecha a conexão automaticamente se outra aba atualizar o banco.
          req.result.onversionchange = () => req.result.close();
          resolve(req.result);
        };

        req.onerror = () => {
          fail(req.error || new Error('Falha ao abrir o banco de dados.'));
        };

        // O upgrade fica bloqueado quando outra aba ainda usa a versão antiga.
        req.onblocked = () => {
          fail(new Error('O banco de dados está em uso por outra aba do sistema. Feche as outras abas e recarregue a página.'));
        };

        // Segurança contra qualquer situação que deixe a abertura pendurada.
        timer = setTimeout(() => {
          fail(new Error('A abertura do banco de dados demorou demais. Feche outras abas do sistema e recarregue a página.'));
        }, 15000);
      });
    }
    return _dbPromise;
  }

  /**
   * Executa uma operação dentro de uma transação de uma Store.
   * @param {string} storeName - Nome da store.
   * @param {string} mode - 'readonly' | 'readwrite'.
   * @param {Function} onStore - Recebe a store e retorna um IDBRequest.
   * @returns {Promise<*>}
   */
  function tx(storeName, mode, onStore) {
    return new Promise((resolve, reject) => {
      open().then((db) => {
        const t = db.transaction(storeName, mode);
        const store = t.objectStore(storeName);
        let res;
        try {
          res = onStore(store);
        } catch (err) {
          reject(err);
          return;
        }
        if (res && typeof res.onsuccess !== 'undefined') {
          res.onsuccess = () => resolve(res.result);
          res.onerror = () => reject(res.error);
        } else {
          t.oncomplete = () => resolve(res);
        }
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error || new Error('Transação abortada.'));
      }).catch(reject);
    });
  }

  /**
   * API reutilizável de uma Store específica.
   * @param {string} storeName
   */
  function store(storeName) {
    return {
      /** Insere um novo registro. */
      add: (data) => tx(storeName, 'readwrite', (s) => s.add(data)),
      /** Insere ou atualiza um registro existente. */
      put: (data) => tx(storeName, 'readwrite', (s) => s.put(data)),
      /** Exclui um registro pelo id. */
      remove: (id) => tx(storeName, 'readwrite', (s) => s.delete(id)),
      /** Limpa toda a store. */
      clear: () => tx(storeName, 'readwrite', (s) => s.clear()),
      /** Retorna um registro pelo id. */
      get: (id) => tx(storeName, 'readonly', (s) => s.get(id)),
      /** Retorna todos os registros. */
      getAll: () => tx(storeName, 'readonly', (s) => s.getAll()),
      /** Retorna a quantidade de registros. */
      count: () => tx(storeName, 'readonly', (s) => s.count()),
      /** Busca registros por um índice. */
      byIndex: (indexName, value) => tx(storeName, 'readonly', (s) => s.index(indexName).getAll(value))
    };
  }

  /**
   * Exporta todos os registros de uma store (para backup).
   * @param {string} storeName
   * @returns {Promise<Array>}
   */
  async function exportStore(storeName) {
    return store(storeName).getAll();
  }

  /**
   * Importa registros em uma store (restauração de backup).
   * @param {string} storeName
   * @param {Array} rows
   */
  async function importStore(storeName, rows) {
    await store(storeName).clear();
    for (const row of rows) {
      await store(storeName).put(row);
    }
  }

  return {
    open,
    store,
    exportStore,
    importStore,
    DB_NAME,
    SCHEMA
  };
})();
