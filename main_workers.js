import os from 'node:os';
import WorkerPool from './worker_pool.js';

const pool = new WorkerPool(os.availableParallelism());

let finished = 0;

for (let i = 0; i < 10; i++) {
  pool.runTask({ a: 42, b: 100}, (err, result) => {
    console.log(i, err, result)
    if (++finished === 10)
        pool.close()
  })
}