import { relative } from 'path'
import { green, red, yellowBright, cyanBright } from 'chalk'
import isEmpty from 'lodash/isEmpty'

import { bash } from "../utils"
import { GitStatus, RepositoryWithStatus } from "../interfaces/status"
import { Repository } from '../interfaces/ngm-dot'
import displayProcess from '../utils/display-process'
import { pad_right_to } from '../utils/pad-str'

const parse_change = (status: Record<string, any>, code: string, ...change: string[]) => {

  switch (code) {
    case 'M':
      status.modified = [...(status.modified || []), change.join(' ')]
      break
    case 'A':
      status.added = [...(status.added || []), change.join(' ')]
      break
    case 'D':
      status.deleted = [...(status.deleted || []), change.join(' ')]
      break
    case 'R':
      status.renamed = [...(status.renamed || []), [change[0], change[2]]] as [string, string][]
      break
    case 'C':
      status.copied = [...(status.copied || []), change.join(' ')]
      break
    case 'U':
      status.unmerged = [...(status.unmerged || []), change.join(' ')]
      break
  }

}

const parse_status_line = (status: GitStatus, line: string): GitStatus => {
  const line_status_raw = line.substring(0, 2)
  const parts = line.substring(3, line.length).split(' ')

  if (line_status_raw === '??') {
    status.untracked = [...(status.untracked || []), parts.join(' ')]
    return status
  } else if (line_status_raw === '##') {
    const rest = parts.join(' ')
    status.head.upstream = rest.includes('...')
    if (rest.includes('[')) {
      status.head.ahead = Number((/ahead (?<ahead>\d+)/.exec(rest)?.groups || {ahead: '0'})['ahead'])
      status.head.behind = Number((/behind (?<behind>\d+)/.exec(rest)?.groups || {behind: '0'})['behind'])
    }
    return status
  }

  const line_status = line_status_raw.split('') || []

  parse_change(status.staged, line_status[0], ...parts)
  parse_change(status.unstaged, line_status[1], ...parts)

  return status
}

const parse_status= (raw: string): GitStatus => {

  const lines = raw.split('\n')

  return lines.reduce<GitStatus>(parse_status_line, {
    staged: {},
    unstaged: {},
    untracked: [],
    head: {
      ahead: 0,
      behind: 0,
      upstream: false,
    }
  })

}

const print_file_status = (status: GitStatus): string => {

  const lines = []

  lines.push(...(status.staged.modified?.map(file => green(` M ${file}`)) || []))
  lines.push(...(status.staged.added   ?.map(file => green(` A ${file}`)) || []))
  lines.push(...(status.staged.deleted ?.map(file => green(` D ${file}`)) || []))
  lines.push(...(status.staged.renamed ?.map(file => green(` R ${file}`)) || []))
  lines.push(...(status.staged.copied  ?.map(file => green(` C ${file}`)) || []))
  lines.push(...(status.staged.unmerged?.map(file => green(` U ${file}`)) || []))
  lines.push('')
  lines.push(...(status.unstaged.modified?.map(file => red(` M ${file}`)) || []))
  lines.push(...(status.unstaged.deleted ?.map(file => red(` D ${file}`)) || []))
  lines.push(...(status.unstaged.renamed ?.map(file => red(` R ${file}`)) || []))
  lines.push(...(status.unstaged.copied  ?.map(file => red(` C ${file}`)) || []))
  lines.push(...(status.unstaged.unmerged?.map(file => red(` U ${file}`)) || []))
  lines.push('')
  lines.push(...(status.untracked?.map(file => red(` ? ${file}`)) || []))

  return lines.join('\n').concat('\n')

}

const print_branch_status = (mod: RepositoryWithStatus): string => {

  const branch = mod.status.head.upstream
    && mod.status.head.ahead === 0
    && mod.status.head.behind === 0
    ? `origin/${mod.current_branch}`
    : mod.current_branch

  const remote_status = mod.status.head.ahead || mod.status.head.behind
    ? ' | '.concat([
      `${mod.status.head.behind} ${red('⇃')}`,
      `${cyanBright('↾')} ${mod.status.head.ahead}`
    ].join('').concat(` | origin/${mod.current_branch}`))
    : ''

  const color = mod.status.head.ahead + mod.status.head.behind > 0 ? yellowBright : cyanBright

  return color(`[${branch}${remote_status}]`)
}

const has_changes = (status: GitStatus) => [
    Boolean(status.untracked?.length),
    Boolean(status.staged.modified?.length),
    Boolean(status.staged.added?.length),
    Boolean(status.staged.deleted?.length),
    Boolean(status.staged.renamed?.length),
    Boolean(status.staged.copied?.length),
    Boolean(status.staged.unmerged?.length),
    Boolean(status.unstaged.modified?.length),
    Boolean(status.unstaged.deleted?.length),
    Boolean(status.unstaged.renamed?.length),
    Boolean(status.unstaged.copied?.length),
    Boolean(status.unstaged.unmerged?.length),
  ].some(v => v)

const status = (repositories: Repository[]): Promise<RepositoryWithStatus[]> => Promise.all(repositories.map(async (mod) => ({
    ...mod,
    status: parse_status((await bash('git', { cwd: mod.path }, 'status', '--porcelain', '-b'))[0]),
    current_branch: (await bash('git', { cwd: mod.path }, 'branch' ,'--show-current'))[0].trim()
  })))

export default status
export const print_status = async (statuses: Promise<RepositoryWithStatus[]>) => {

  const statusList = (await displayProcess('Checking Statuses', statuses))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = statusList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    statusList.map(mod => {
      const color = has_changes(mod.status) ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        has_changes(mod.status) && print_file_status(mod.status)
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
