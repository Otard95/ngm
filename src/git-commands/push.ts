import { relative } from 'path'

import { bash } from "../utils"
import status, { print_branch_status } from './status'
import { Repository } from '../interfaces/ngm-dot'
import { ProcessInput } from '../utils/display-process'
import { PromiseResult } from '../utils/promise'
import { pad_right_to } from '../utils/pad-str'
import { cyanBright, yellowBright } from 'chalk'
import isEmpty from 'lodash/isEmpty'
import GitError from './common/git-error'

export interface PushInfo extends Repository { push_output: string }
const push = (repositories: Repository[], git_args: string[] = []): ProcessInput<PushInfo>[] => repositories
  .map<ProcessInput<PushInfo>>((mod): ProcessInput<PushInfo> => {
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'push', ...git_args)
        .then(([out]) => ({ ...mod, push_output: out }))
        .catch(err => {throw new GitError(err.message, mod)})
    }
  })
export default push
export const print_push = async (results: PromiseResult<PushInfo, GitError>[]) => {

  const resolvedPushInfo = results
    .map<PushInfo>(r => {
      return r.success
        ? r.res
        : { ...r.err.repository, push_output: r.err.message }
    })

  const pullInfoList = (await status(resolvedPushInfo ))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = pullInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    pullInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.push_output
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
