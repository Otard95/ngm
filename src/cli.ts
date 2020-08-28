import NGMApi from "./api"
import commands, { CommandFn } from './cli-commands'
import ExecSequence, { SequenceFunc } from './utils/exec-sequence'
import init_flags from "./cli-flags"

const simple_usage = `usage: ngm <COMMAND> [OPTIONS]
  use the -h option for more info
`

export default async (): Promise<void> => {

  NGMApi.Init(process.cwd())
  const cmds = commands()
  const ngm_flags = init_flags()

  const params: string[] = []
  let command = ''
  const ngm_handlers: SequenceFunc[] = []

  process.argv.forEach(arg => {
    if (cmds.has(arg))
      command = arg
    else if (ngm_flags.has(arg))
      ngm_handlers.push(ngm_flags.get(arg) as SequenceFunc)
    else
     params.push(arg)
  })

  const runner = new ExecSequence()

  ngm_handlers.forEach(handler => runner.push(handler))

  runner
    .push(async (next, err): Promise<void> => {
      try {
        await (cmds.get(command) as CommandFn)(NGMApi.Instance, ...params)
        next()
      } catch (e) {
        err(`Status command failed\n\t${e.message || 'unknown error'}`)
      }
    })

  try {
    await runner.exec()
  } catch (e) {
    console.error(`[ERROR]  ${e.message}\n\n${simple_usage}`)
  }

  return
  
}
