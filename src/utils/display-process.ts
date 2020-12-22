import rl from 'readline'
import { promisify } from 'util'
import chalk from "chalk";
import caretPos from "./caretPos";
import { pad_right_to } from "./pad-str";
import { arrayForEachSequential, makeTrackablePromise, TrackablePromise } from "./promise";

const loading_icons = ['⠏', '⠛', '⠹', '⠼', '⠶', '⠧']
const displayProcessSingle = async <R>(message: string, promise: Promise<R>): Promise<R> => {

  let i = 0
  promisify(process.stdout.write.bind(process.stdout))(`${message} ${chalk.blue(loading_icons[i])}`)
  const loading_interval = setInterval(async () => {
    await promisify(rl.moveCursor)(process.stdout, -1, 0)
    i = (i + 1) % loading_icons.length
    process.stdout.write(chalk.blue(`${loading_icons[i]}`))
  }, 100)

  try {
    const res = await promise
    clearInterval(loading_interval)
    await promisify(rl.moveCursor)(process.stdout, -1, 0)
    console.log(chalk.green('[ DONE ]'))
    return res
  } catch (e) {
    clearInterval(loading_interval)
    await promisify(rl.moveCursor)(process.stdout, -1, 0)
    console.log(chalk.red('[ ERROR ]'))
    throw e
  }

}

interface Process<R> {
  label: string;
  promise: TrackablePromise<R> 
}
export interface ProcessInput<R> {
  label: string
  promise: Promise<R> 
}
export interface DisplayProcess {
  <R>(message: string, promise: Promise<R>): Promise<R>
  <R>(...precesses: ProcessInput<R>[]): Promise<R[]>
}
const displayProcess: DisplayProcess = async <R>(...args: unknown[]) => {

  if (args.length === 2 && typeof args[0] === 'string')
    return await displayProcessSingle<R>(args[0], args[1] as Promise<R>)

  const processes: Process<R>[] = (args as ProcessInput<R>[])
    .map(({ label, promise }) => ({ label, promise: makeTrackablePromise(promise) }))

  const loading_col = processes
    .reduce((col, { label }) => Math.max(col, label.length + 1), 0)

  const startPos = process.env['NODE_ENV'] === 'debug' ? {row: 0, col:0} : await caretPos()
  const out = process.stdout

  // initial status print
  processes
    .forEach((p) => out.write(
      `${pad_right_to(p.label, loading_col)}${chalk.blue(loading_icons[0])}\n`
    ))

  // setup status update function
  let loading_i = 0
  const printStatus = async () => {
    loading_i = (loading_i + 1) % loading_icons.length
    await arrayForEachSequential(processes, async (p, i) => {

      await promisify(
        (rl.cursorTo)
      )(out, loading_col, startPos.row + i)

      const status = p.promise.resolved
        ? chalk.green('[DONE]')
        : p.promise.rejected
          ? chalk.red('[ERROR]')
          : chalk.blue(loading_icons[loading_i])

      await promisify(out.write.bind(out))(status)

    })
    console.log()
  }
  // start status update interval
  const loading_interval = setInterval(printStatus, 100)

  // await result
  const res = await Promise.all(processes.map(p => p.promise))
  // stop status update cycle
  clearInterval(loading_interval)
  // clear update output
  await promisify(rl.cursorTo)(out, startPos.col, startPos.row)
  await promisify(rl.clearScreenDown)(out)
  await promisify(rl.cursorTo)(out, startPos.col, startPos.row)
  
  return res

}
export default displayProcess
