import { parentPort } from 'node:worker_threads'

parentPort.on('message', (task) => {
  parentPort.postMessage(task.a + task.b)
})