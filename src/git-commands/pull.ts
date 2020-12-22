import { relative } from 'path'
import { yellowBright, cyanBright } from 'chalk'
import isEmpty from 'lodash/isEmpty'

import { bash } from "../utils"
import status, { print_branch_status } from './status'
import { Repository } from '../interfaces/ngm-dot'
import displayProcess, { ProcessInput } from '../utils/display-process'
import { pad_right_to } from '../utils/pad-str'

export interface PullInfo extends Repository { pull_output: string }
const pull = (repositories: Repository[]): ProcessInput<PullInfo>[] => repositories
  .map<ProcessInput<PullInfo>>((mod): ProcessInput<PullInfo> => {
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'pull').then(([out]) => ({ ...mod, pull_output: out }))
    }
  })
export default pull
export const print_pull = async (processes: ProcessInput<PullInfo>[]) => {

  const pullInfoList = (await status(await displayProcess(...processes)))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = pullInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    pullInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.pull_output
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
