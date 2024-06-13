import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import http from 'node:http';

const __filename = new URL(import.meta.url).pathname;

const asyncLocalStorage = new AsyncLocalStorage();

function logWithId(msg) {
  const id = asyncLocalStorage.getStore();
  console.log(`${id !== undefined ? id : '-'}:`, msg);
}

function simulateDatabaseQuery(query, callback) {
  setTimeout(() => {
    logWithId(`Database query: ${query}`);
    callback();
  }, Math.random() * 100);
}

function simulateApiCall(endpoint, callback) {
  setTimeout(() => {
    logWithId(`API call to: ${endpoint}`);
    callback();
  }, Math.random() * 100);
}

let idSeq = 0;
http.createServer((req, res) => {
  asyncLocalStorage.run(idSeq++, () => {
    logWithId('start');

    setImmediate(() => {
      logWithId('in setImmediate');

      simulateApiCall('/external-api', () => {
        logWithId('after API call');

        simulateDatabaseQuery('SELECT * FROM users', () => {
          logWithId('after database query');

          fs.readFile(__filename, () => {
            logWithId('after file read');
            res.end('done');
          });
        });
      });
    });
  });
}).listen(8080);

for (let i = 0; i < 10; i++) {
  http.get('http://localhost:8080');
}
