import { resolve } from 'path'
import rl from 'readline'
import { promisify } from 'util'
import { noop } from "lodash"
import NGMApi from "./api"
import commands from './cli-commands'
import ExecSequence from './utils/exec-sequence'
import init_flags from "./cli-flags"
import read_dot from "./subroutines/read-dot"
import { NGMDot, Project, ProjectId, Repository, RepositoryId } from "./interfaces/ngm-dot"
import { intersect } from "./utils/array"

const simple_usage = `usage: ngm [COMMAND] [PROJECT] [...OPTIONS]
  use the -h option for more info
`

export interface CLIContext {
  command: string
  command_buffer?: any
  flags?: string[]
  git_args?: string[]
  project_id?: ProjectId
  repository_ids?: RepositoryId[]
  ngm_dot: NGMDot
}

export default async (): Promise<void> => {

  await promisify(process.stdout.write.bind(process.stdout))(
    Array
      .from({ length: process.stdout.rows })
      .fill('\n')
      .join('')
  )
  await promisify(rl.cursorTo)(process.stdout, 0, 1)

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
        return err('You may only specify one project')
      }
      if (selected_project.length > 0) {
        context.project_id = project_name_map[selected_project[0]].id
      }

      next()

    })
    .push(async (context, args, next, _err) => {

      const repository_paths = context.ngm_dot.repositories.map((r) => r.path)

      const repository_ids = args
        .filter(arg => /(\.\/)?([\w-]+\/)*([\w-]+)?/.test(arg))
        .map(arg => resolve(process.cwd(), arg))
        .filter(path => repository_paths.includes(path))
        .map(path => context.ngm_dot.repositories.find(repo => repo.path === path))
        .filter((repo): repo is Repository => repo !== undefined)
        .map(repo => repo.id)

      if (repository_ids.length > 0)
        context.repository_ids = repository_ids

      next()

    })
    .push(async (context, args, next, err, done): Promise<void> => {

      const command_args = intersect(Array.from(cmds.keys()), args)
      command_args.forEach(cmd => args.splice(args.indexOf(cmd), 1))

      if (command_args.length > 1) {
        return err('You may only specify one command.')
      }
      if (command_args.length > 0) {
        context.command = command_args[0]
      }
      
      const { cmd, cmd_arg_parser } = cmds.get(context.command) || {}
      if (!cmd) return err('You must specify a command')
      cmd_arg_parser && cmd_arg_parser(context, args, next, err, done)

      context.git_args = args

      next()

    })
    .push(async (context, _args, _next, _err, done) => {

      const { cmd } = cmds.get(context.command) || { cmd: noop }
      cmd(await NGMApi.Init(context.ngm_dot), context)
      done()

    })

  try {
    await runner.exec(
      { ngm_dot, command: 'status' },
      [...process.argv.slice(2)]
    )
  } catch (e) {
    console.error(`${e}\n\n${simple_usage}`)
  }

  return
  
}
