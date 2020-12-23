import { relative } from 'path'
import { yellowBright, cyanBright } from 'chalk'
import isEmpty from 'lodash/isEmpty'

import { bash } from "../utils"
import status, { print_branch_status, print_file_status } from './status'
import { Repository } from '../interfaces/ngm-dot'
import { ProcessInput } from '../utils/display-process'
import { pad_right_to } from '../utils/pad-str'
import { PromiseResult } from '../utils/promise'
import GitError from './common/git-error'

export interface AddInfo extends Repository { add_output: string }
const add = (repositories: Repository[], git_args: string[] = []): ProcessInput<AddInfo>[] => repositories
  .map<ProcessInput<AddInfo>>((mod): ProcessInput<AddInfo> => {
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'add', ...git_args)
        .then(([out]) => ({ ...mod, add_output: out }))
        .catch(err => {throw new GitError(err.message, mod)})
    }
  })
export default add
export const print_add = async (results: PromiseResult<AddInfo, GitError>[]) => {

  const resolvedAddInfo = results
    .map<AddInfo>(r => {
      return r.success
        ? r.res
        : { ...r.err.repository, add_output: r.err.message }
    })

  const addInfoList = (await status(resolvedAddInfo))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = addInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    addInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.status.has_changes && print_file_status(mod.status)
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
