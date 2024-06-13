import { AsyncResource } from 'node:async_hooks'
import { EventEmitter } from 'node:events'
import { Worker } from 'node:worker_threads'

const kTaskInfo = Symbol('kTaskInfo')
const kWorkerFreedEvent = Symbol('kWorkerFreedEvent')

class WorkerPoolTaskInfo extends AsyncResource {
  constructor(callback) {
    super('WorkerPoolTaskInfo')
    this.callback = callback
  }

  done(err, result) {
    this.runInAsyncScope(this.callback, null, err, result)
    this.emitDestroy()
  }
}

export default class WorkerPool extends EventEmitter {
  constructor(numThreads) {
    super()
    this.numThreads = numThreads
    this.workers = []
    this.freeWorkers = []
    this.tasks = []

    for (let i = 0; i < numThreads; i++)
      this.addNewWorker()

    this.on(kWorkerFreedEvent, () => {
      if (this.tasks.length > 0) {
        const { task, callback } = this.tasks.shift()
        this.runTask(task, callback)
      }
    })
  }


  addNewWorker() {
    const worker = new Worker(new URL('task_processor.js', import.meta.url))
    worker.on('message', (result) => {
      worker[kTaskInfo].done(null, result)
      worker[kTaskInfo] = null

      this.freeWorkers.push(worker)
      this.emit(kWorkerFreedEvent)
    })
    worker.on('error', (err) => {
      if (worker[kTaskInfo])
        worker[kTaskInfo].done(err, null);
      else
        this.emit('error', err)

      this.workers.splice(this.workers.indexOf(worker), 1)
      this.addNewWorker()
    })
    this.workers.push(worker)
    this.freeWorkers.push(worker)
    this.emit(kWorkerFreedEvent)
  }

  runTask(task, callback) {
    if (this.freeWorkers.length === 0) {
      this.tasks.push({ task, callback })
      return
    }

    const worker = this.freeWorkers.pop()
    worker[kTaskInfo] = new WorkerPoolTaskInfo(callback)
    worker.postMessage(task)
  }

  close() {
    for (const worker of this.workers) worker.terminate()
  }


}