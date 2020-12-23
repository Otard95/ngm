import { relative } from 'path'
import { yellowBright, cyanBright } from 'chalk'
import isEmpty from 'lodash/isEmpty'

import { bash } from "../utils"
import status, { print_branch_status } from './status'
import { Repository } from '../interfaces/ngm-dot'
import { ProcessInput } from '../utils/display-process'
import { pad_right_to } from '../utils/pad-str'
import { PromiseResult } from '../utils/promise'
import GitError from './common/git-error'

export interface CommitInfo extends Repository { commit_output: string }
const commit = (repositories: Repository[], git_args: string[] = []): ProcessInput<CommitInfo>[] => repositories
  .map<ProcessInput<CommitInfo>>((mod): ProcessInput<CommitInfo> => {
    const resolved_git_args = git_args.map(a => {
      if (!a.trim().includes(' ')) return a
      if (
        (
          a.trim().startsWith('"')
          && a.trim().endsWith('"')
        ) || (
          a.trim().startsWith("'")
          && a.trim().endsWith("'")
        )
      ) return a
      return `"${a}"`
    })
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'commit', ...resolved_git_args)
        .then(([out]) => ({ ...mod, commit_output: out }))
        .catch(err => {throw new GitError(err.message, mod)})
    }
  })
export default commit
export const print_commit = async (results: PromiseResult<CommitInfo, GitError>[]) => {

  const resolvedCommitInfo = results
    .map<CommitInfo>(r => {
      return r.success
        ? r.res
        : { ...r.err.repository, commit_output: r.err.message }
    })

  const commitInfoList = (await status(resolvedCommitInfo))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = commitInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    commitInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.commit_output
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
