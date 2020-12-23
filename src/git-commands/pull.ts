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

export interface PullInfo extends Repository { pull_output: string }
const pull = (repositories: Repository[], git_args: string[] = []): ProcessInput<PullInfo>[] => repositories
  .map<ProcessInput<PullInfo>>((mod): ProcessInput<PullInfo> => {
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'pull', ...git_args)
        .then(([out]) => ({ ...mod, pull_output: out }))
        .catch(err => {throw new GitError(err.message, mod)})
    }
  })
export default pull
export const print_pull = async (results: PromiseResult<PullInfo, GitError>[]) => {

  const resolvedPullInfo = results
    .map<PullInfo>(r => {
      return r.success
        ? r.res
        : { ...r.err.repository, pull_output: r.err.message }
    })

  const pushInfoList = (await status(resolvedPullInfo))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = pushInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    pushInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.pull_output
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
