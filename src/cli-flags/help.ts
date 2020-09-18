import chalk from 'chalk'
import { CLIOpts } from '../interfaces/cli'
import { SequenceFunc } from '../utils/exec-sequence'

chalk.bgRgb

const usage = chalk`{cyan.bold usage:} ngm [COMMAND] [PROJECT] [...OPTIONS]

  COMMANDS

    status        Display the status ow any relevant repositories.
    
  OPTIONS`

const padRightTo = (str: string, len: number) => `${str}${Array.from({ length: Math.max(0, len - str.length) }).map(() => ' ').join('')}`

const createHelpFunc = <C>(usage: string): SequenceFunc<C> => {
  return (_c, args, next, _err, done) => {
    if (args.includes('-h') || args.includes('--help')) {
      console.log(usage)
      done()
    }
    next()
  }
}

export default <C>(opts: CLIOpts<C>): CLIOpts<C> => {
  const longestShotOpt = opts.reduce<number>((acc, val) => Math.max(acc, val[2][0].length), 0)
  const longestLongOpt = opts.reduce<number>((acc, val) => (val[2].length > 2 ? Math.max(acc, val[2][1].length) : acc), 0)
  const flagSectionLength = longestLongOpt + longestShotOpt + 6

  const optLines = ([
    [-1, ((_c, _a, n) => n()) as SequenceFunc<C>, ['h', 'help', chalk`Show this message`]],
    ...opts
  ] as CLIOpts<C>).reduce<string>((acc, opt) => {
    const helpInfo = opt[2];
    const hasLongFlag = helpInfo.length > 2

    return `${acc}\n    ${hasLongFlag
        ? `${padRightTo(`-${helpInfo[0]}`, longestShotOpt + 1)} | ${padRightTo(`--${helpInfo[1]}`, longestLongOpt + 2)}`
        : padRightTo(`-${helpInfo[0]}`, flagSectionLength)
      }    ${hasLongFlag ? helpInfo[2] : chalk`${helpInfo[1]} {gray not config option}`}`
  }, '')

  return [...opts, [100, createHelpFunc(`${usage}\n    ${optLines}\n`), ['', '']]]
}
