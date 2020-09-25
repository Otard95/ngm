import { relative, resolve } from 'path'
import { CommandFn } from ".";
import { SequenceFunc } from "../utils/exec-sequence";
import { CLIContext } from "../cli";
import { Module } from "../interfaces/ngm-dot";
import displayProcess from '../utils/display-process';
import chalk from 'chalk';

interface ProjectBuffer {
  sub_cmd: 'create' | 'add' | 'remove' | 'list' | 'detail'
  args: string[]
}

const get_non_repo_paths = (modules: Module[], paths: string[]): string[] => {
  const module_paths = modules.map(m => m.path)
  return paths.filter(p => !module_paths.includes(resolve(process.cwd(), p)))
}

export const args_parser: SequenceFunc<CLIContext> = (context, args, _next, err) => {

  const buff: SomePartial<ProjectBuffer, 'sub_cmd'> = { args: [] }
  args.forEach((arg): any => {
    if (!buff.sub_cmd && ['create', 'add', 'remove', 'list', 'detail'].includes(arg))
      return buff.sub_cmd = arg as ProjectBuffer['sub_cmd']

    if (!arg.startsWith('-')) buff.args.push(arg)
  })

  if (!buff.sub_cmd) return err('The project command requires specifier')
  switch(buff.sub_cmd) {
    case 'create':
      if (context.project_id) return err('That project already existed')
      if (buff.args.length < 2) return err(chalk`project create requires {yellow <project-name>} and {yellow <new-branch-name>}`)
      if (buff.args.length > 2) return err('To many arguments')
      break
    case 'add':
    case 'remove':
      if (!context.project_id) return err(buff.args.length > 0 ? `Unknown project: ${chalk.yellow(buff.args[0])}` : 'Missing project name')
      if (buff.args.length === 0) return err(chalk`project ${buff.sub_cmd} requires {yellow <project-name>} and {yellow <...repo-path>}`)
      const non_module_paths = get_non_repo_paths(context.ngm_dot.modules, buff.args)
      if (non_module_paths.length > 0) return err(`Director${
          non_module_paths.length > 1
            ? 'ies'
            : 'y'
        } ${non_module_paths.map(p => chalk.yellow(relative(process.cwd(), p) || './')).join(', ')} ${
          non_module_paths.length > 1
            ? 'are not repositories'
            : 'is not a repository'
        }`)
      buff.args = buff.args
        .map(a => (context.ngm_dot.modules.find(m => m.path === resolve(process.cwd(), a)) as Module).id)
      break
    case 'detail':
      if (!context.project_id) return err(buff.args.length > 0 ? `Unknown project: ${chalk.yellow(buff.args[0])}` : 'Missing project name')
  }

  args.splice(args.indexOf(buff.sub_cmd))
  buff.args.forEach(arg => args.splice(args.indexOf(arg)))


  context.command_buffer = buff

}
const project_command: CommandFn = async (api, context) => {

  const command_buffer: ProjectBuffer = context.command_buffer
  switch (command_buffer.sub_cmd) {
    case 'create':
      displayProcess<void>('Creating project', api.project_create(command_buffer.args[0], command_buffer.args[1]))
      break

    case 'add':
      displayProcess<void>('Adding repositories', api.project_add(context.project_id || '', ...command_buffer.args))
      break

    case 'remove':
      displayProcess<void>('Removing repositories', api.project_remove(context.project_id || '', ...command_buffer.args))
      break

    case 'list':
      console.log(
        [
          'ID                              \tName\tBranch',
          ...context.ngm_dot.projects
            .map(p => chalk`{gray ${p.id}}\t${p.name}\t${p.branch}`)
        ].join('\n')
      )
      break

    case 'detail':
      const project = context.ngm_dot.project_map[context.project_id || '']
      const modules = project.modules_ids.map(mid => context.ngm_dot.module_map[mid])
      console.log(
        [
          `ID: ${project.id}`,
          `Name: ${project.name}`,
          `Branch: ${project.branch}`,
          `Modules: ${modules.length === 0 ? chalk.gray('none') : ''}`,
          ...modules.map(m => chalk`  {gray ${m.id}}\t${relative(process.cwd(), m.path) || './'}\t${m.url}`)
        ].join('\n')
      )
      break

    default:
      console.log(context)
  }

}
export default project_command