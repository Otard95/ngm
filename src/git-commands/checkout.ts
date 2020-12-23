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

export interface CheckoutInfo extends Repository { checkout_output: string }
const checkout = (repositories: Repository[], git_args: string[] = []): ProcessInput<CheckoutInfo>[] => repositories
  .map<ProcessInput<CheckoutInfo>>((mod): ProcessInput<CheckoutInfo> => {
    return {
      label: relative(process.cwd(), mod.path) || './',
      promise: bash('git', { cwd: mod.path }, 'checkout', ...git_args)
        .then(([out]) => ({ ...mod, checkout_output: out }))
        .catch(err => {throw new GitError(err.message, mod)})
    }
  })
export default checkout
export const print_checkout = async (results: PromiseResult<CheckoutInfo, GitError>[]) => {

  const resolvedCheckoutInfo = results
    .map<CheckoutInfo>(r => {
      return r.success
        ? r.res
        : { ...r.err.repository, checkout_output: r.err.message }
    })

  const checkoutInfoList = (await status(resolvedCheckoutInfo))
    .map(s => ({ ...s, pretty_name: (relative(process.cwd(), s.path) || './') }))

  const longest_name = checkoutInfoList.reduce((acc, s) => Math.max(acc, s.pretty_name.length), 0)

  console.log(
    checkoutInfoList.map(mod => {
      const color = mod.status.has_changes ? yellowBright : cyanBright

      return [
        color(`${pad_right_to(mod.pretty_name, longest_name+1)} ${print_branch_status(mod)}`),
        mod.checkout_output
      ].filter(s => !isEmpty(s)).join('\n')
    }).join('\n')
  )

}
