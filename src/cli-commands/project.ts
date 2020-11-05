import { relative, resolve } from 'path'
import { CommandFn } from ".";
import { SequenceFunc } from "../utils/exec-sequence";
import { CLIContext } from "../cli";
import { Repository } from "../interfaces/ngm-dot";
import displayProcess from '../utils/display-process';
import chalk from 'chalk';
import { pad_right_to } from '../utils/pad-str';
import { isString } from 'lodash';
import { first_of_a_in_b } from '../utils/array';

interface ProjectBuffer {
  sub_cmd: 'create' | 'add' | 'remove' | 'list' | 'detail'
  args: string[]
}

const get_non_repo_paths = (repositories: Repository[], paths: string[]): string[] => {
  const repository_paths = repositories.map(m => m.path)
  return paths.filter(p => !repository_paths.includes(resolve(process.cwd(), p)))
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
      const non_repository_paths = get_non_repo_paths(context.ngm_dot.repositories, buff.args)
      if (non_repository_paths.length > 0) return err(`Director${
          non_repository_paths.length > 1
            ? 'ies'
            : 'y'
        } ${non_repository_paths.map(p => chalk.yellow(relative(process.cwd(), p) || './')).join(', ')} ${
          non_repository_paths.length > 1
            ? 'are not repositories'
            : 'is not a repository'
        }`)
      buff.args = buff.args
        .map(a => (context.ngm_dot.repositories.find(m => m.path === resolve(process.cwd(), a)) as Repository).id)
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
  const id_len = 32

  switch (command_buffer.sub_cmd) {
    case 'create':
      displayProcess<void>('Creating project', api.project_create(command_buffer.args[0], command_buffer.args[1]))
      break

    case 'add': {
      const pid = context.project_id
      if (!isString(pid)) throw new Error('Missing project')

      await displayProcess<void>('Adding repositories', api.project_add(pid, ...command_buffer.args))
      await displayProcess('Checking out repositories', Promise.all(command_buffer.args.map(rid => api.checkout(rid, context.ngm_dot.project_map[pid].branch))))

      await api.save_dot()
      }
      break

    case 'remove': {
      const pid = context.project_id
      if (!isString(pid)) throw new Error('Missing project')

      await displayProcess<void>('Removing repositories', api.project_remove(context.project_id || '', ...command_buffer.args))
      await displayProcess(
        'Checking out repositories',
        Promise.all(command_buffer.args.map(rid => {
          const repo = context.ngm_dot.repository_map[rid]
          const branch = first_of_a_in_b(['dev', 'development', 'master', 'main'], repo.branches)
          if (!isString(branch)) return ['',1]
          return api.checkout(rid, branch)
        })
      ))

      await api.save_dot()
      }
      break

    case 'list':
      const name_len = context.ngm_dot.projects.reduce((acc, p) => Math.max(acc, p.name.length), 0)
      const branch_len = context.ngm_dot.projects.reduce((acc, p) => Math.max(acc, p.branch.length), 0)

      console.log(
        [
          `${pad_right_to('ID', id_len)}  ${pad_right_to('Name', name_len)}  ${pad_right_to('Branch', branch_len)}`,
          ...context.ngm_dot.projects
            .map(p => chalk`{gray ${p.id}}  ${pad_right_to(p.name, name_len)}  ${pad_right_to(p.branch, branch_len)}`)
        ].join('\n')
      )
      return

    case 'detail':
      const project = context.ngm_dot.project_map[context.project_id || '']
      const repositories = project.repository_ids.map(mid => context.ngm_dot.repository_map[mid])
      const path_len = repositories.reduce((acc, m) => Math.max(acc, (relative(process.cwd(), m.path) || './').length), 0)
      const url_len =  repositories.reduce((acc, m) => Math.max(acc, m.url.length), 0)
      
      console.log(
        [
          `ID: ${project.id}`,
          `Name: ${project.name}`,
          `Branch: ${project.branch}`,
          `Repositories: ${repositories.length === 0 ? chalk.gray('none') : ''}`,
          ...repositories.map(m => chalk`  {gray ${m.id}}  ${pad_right_to(relative(process.cwd(), m.path) || './', path_len)}  ${pad_right_to(m.url, url_len)}`)
        ].join('\n')
      )
      return

    default:
      console.log(context)
  }

  if (!(await api.save_dot())) throw new Error('Failed to save ngm dot')

}
export default project_command