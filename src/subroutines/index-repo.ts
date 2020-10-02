import { resolve, relative } from 'path'
import { createHash } from 'crypto'
import isEmpty from 'lodash/isEmpty'

import bash from '../utils/bash'
import { Repository } from '../interfaces/ngm-dot'

/**
 * Get git info from a path as a Repository
 */
export default async (dir: string): Promise<Repository> => {
  const path = resolve(dir)

  const remote_raw = await bash('git', { cwd: path }, 'remote', '-v')
  const branch_raw = await bash('git', { cwd: path }, 'rev-parse', '--abbrev-ref', 'HEAD')

  if (remote_raw[1] === 1) throw new Error(`Failed to get remote for ${relative(process.cwd(), path)}`)
  if (branch_raw[1] === 1) throw new Error(`Failed to get branch for ${relative(process.cwd(), path)}`)

  const remote = remote_raw[0].split(/[\r\n]+/).reduce<Repository['remote']>((acc, line) => {
    const parts = line.split(/[\s\t]+/)
    if (parts.length < 2) return acc
    const remote_name = parts[0].trim()
    const remote_url = parts[1].trim()
    if (!isEmpty(remote_name)  && !isEmpty(remote_url)) {
      acc[remote_name] = remote_url
    }
    return acc
  }, {} as Repository['remote'])
  
  const url = !isEmpty(remote.origin)
    ? remote.origin.replace(/\.git/, '/src/master').replace(/:/, '/').replace(/git@/, 'https://')
    : Object.keys(remote).length > 0
      ? remote[Object.keys(remote)[0]].replace(/\.git/, '/src/master').replace(/:/, '/').replace(/git@/, 'https://')
      : ''

  const branch = branch_raw[0].trim()

  const partial_repository: Omit<Repository, 'id'> = {
    path,
    remote,
    branch,
    url
  }

  return {
    id: createHash('md5').update(JSON.stringify(partial_repository)).digest('hex'),
    ...partial_repository
  }

}
