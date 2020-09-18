import NGMApi from "./api"
import commands from './cli-commands'
import ExecSequence from './utils/exec-sequence'
import init_flags from "./cli-flags"
import read_dot from "./subroutines/read-dot"
import { NGMDot, Project } from "./interfaces/ngm-dot"
import { intersect } from "./utils/array"

const simple_usage = `usage: ngm <COMMAND> [OPTIONS]
  use the -h option for more info
`

export interface CLIContext {
  command: string
  flags?: string[]
  git_args?: string[]
  project_name?: string
  ngm_dot: NGMDot
}

export default async (): Promise<void> => {

  const ngm_dot = await read_dot(process.cwd())

  const cmds = commands()

  const runner = new ExecSequence<CLIContext>()
  
  init_flags().forEach(opt => runner.push(opt[1], opt[0]))

  runner
    .push(async (context, args, next, err) => {

      const project_name_map = context.ngm_dot.projects.reduce<Record<string, Project>>((acc, p) => ({
        ...acc,
        [p.name]: p
      }), {})

      const selected_project = intersect(Object.keys(project_name_map), args)
      selected_project.forEach(p => args.splice(args.indexOf(p), 1))

      if (selected_project.length > 1) {
        return err('You may only specify ut to one project')
      }
      if (selected_project.length > 0) {
        context.project_name = selected_project[0]
      }

      next()

    })
    .push(async (context, args, _next, err, done): Promise<void> => {

      const command_args = intersect(Array.from(cmds.keys()), args)
      command_args.forEach(cmd => args.splice(args.indexOf(cmd), 1))

      if (command_args.length > 1) {
        return err('You may only specify one command.')
      }
      if (command_args.length > 0) {
        context.command = command_args[0]
      }
      
      context.git_args = args

      const cmd = cmds.get(context.command)
      if (!cmd) return err('Internal error: Could not get command function')
      cmd(await NGMApi.Init(context.ngm_dot), context)
      done()

    })

  try {
    await runner.exec(
      { ngm_dot, command: 'status' },
      [...process.argv]
    )
  } catch (e) {
    console.error(`[EXEC ERROR]  ${e}\n\n${simple_usage}`)
  }

  return
  
}
