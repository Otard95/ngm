import { resolve, relative } from 'path'
import { createHash } from 'crypto'
import bash from '../utils/bash'
import { Module } from '../interfaces/ngm-dot'

export default async (dir: string): Promise<Module> => {
  const path = resolve(dir)

  const remote_raw = await bash('git', { cwd: path }, 'remote', '-v')
  const branch_raw = await bash('git', { cwd: path }, 'rev-parse', '--abbrev-ref', 'HEAD')

  if (remote_raw[1] === 1) throw new Error(`Failed to get remote for ${relative(process.cwd(), path)}`)
  if (branch_raw[1] === 1) throw new Error(`Failed to get branch for ${relative(process.cwd(), path)}`)

  const remote = remote_raw[0].split(/[\r\n]+/)[0].split(/[\s\t]+/)[1].trim()
  const url = remote.replace(/\.git/, '/src/master').replace(/:/, '/').replace(/git@/, 'https://')

  const branch = branch_raw[0].trim()

  const partial_module: Omit<Module, 'id'> = {
    path,
    remote,
    branch,
    url
  }

  return {
    id: createHash('md5').update(JSON.stringify(partial_module)).digest('hex'),
    ...partial_module
  }

}
