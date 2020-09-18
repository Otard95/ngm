import chalk from "chalk";

const displayProcess = <R>(message: string, promise: Promise<R>): Promise<R> => {

  const loading_icons = ['⠏', '⠛', '⠹', '⠼', '⠶', '⠧']
  let i = 0
  process.stdout.write(`${message} ${chalk.blue(loading_icons[i])}`)
  const loading_interval = setInterval(() => {
    process.stdout.moveCursor(-1, 0, () => {
      i = (i + 1) % loading_icons.length
      process.stdout.write(chalk.blue(`${loading_icons[i]}`))
    })
  }, 200)
  return promise
    .then(data => new Promise<R>((res) => {
      clearInterval(loading_interval)
      process.stdout.moveCursor(-1, 0, () => {
        console.log(chalk.green('[ DONE ]'))
        res(data)
      })
    }))
    .catch(err => new Promise<R>((_res, rej) => {
      clearInterval(loading_interval)
      process.stdout.moveCursor(-1, 0, () => {
        console.log(chalk.red('[ ERROR ]'))
        rej(err)
      })
    }))

}
export default displayProcess
