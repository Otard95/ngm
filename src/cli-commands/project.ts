import { relative, resolve } from 'path'
import { CommandFn } from ".";
import { SequenceFunc } from "../utils/exec-sequence";
import { CLIContext } from "../cli";
import { Module } from "../interfaces/ngm-dot";

interface ProjectBuffer {
  sub_cmd: string
  args: string[]
}

const get_non_repo_paths = (modules: Module[], paths: string[]): string[] => {
  const module_paths = modules.map(m => m.path)
  return paths.filter(p => !module_paths.includes(resolve(process.cwd(), p)))
}

export const args_parser: SequenceFunc<CLIContext> = (context, args, _next, err) => {

  const buff: SomePartial<ProjectBuffer, 'sub_cmd'> = { args: [] }
  args.forEach((arg): any => {
    if (!buff.sub_cmd && ['create', 'add', 'remove'].includes(arg)) return buff.sub_cmd = arg
    if (!arg.startsWith('-')) buff.args.push(arg)
  })

  if (!buff.sub_cmd) return err('The project command requires specifier')
  switch(buff.sub_cmd) {
    case 'create':
      if (context.project_id) return err('That project already existed')
      if (buff.args.length < 2) return err('project create requires <project-name> and <new-branch-name>')
      if (buff.args.length > 2) return err('To many arguments')
      break
    case 'add':
    case 'remove':
      if (!context.project_id) return err(buff.args.length > 0 ? `Unknown project: ${buff.args[0]}` : 'Missing project name')
      if (buff.args.length < 2) return err(`project ${buff.sub_cmd} requires <project-name> and <...repo-path>`)
      const non_module_paths = get_non_repo_paths(context.ngm_dot.modules, buff.args.slice(1))
      if (non_module_paths.length > 0) return err(`Directories ${non_module_paths.map(p => relative(process.cwd(), p)).join(', ')} are not repositories`)
      break
  }

  args.splice(args.indexOf(buff.sub_cmd))
  buff.args.forEach(arg => args.splice(args.indexOf(arg)))

  context.command_buffer = buff

}
const project_command: CommandFn = async (_api, context) => console.log('project command', context)
export default project_command