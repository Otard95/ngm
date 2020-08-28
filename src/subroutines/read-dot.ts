import { mkdir as node_mkdir, access, writeFile as node_write_file, readFile } from 'fs'
import { resolve } from 'path'
import { yellow } from 'chalk'
import { NGMDot, Module } from '../interfaces/ngm-dot'
import index_fs from './index-fs'
import index_repo from './index-repo'

const ngm_dir = '.ngm'
const map_file = '.ngm-map.json'

const mkdir = (path: string, ...sub_dir: string[]): Promise<boolean> => {
  return (new Promise((res, rej) => node_mkdir(resolve(path, ...sub_dir), err => {
    if (err) {
      if (err.code === 'EEXIST')
        return res(true)
        
      return rej(err)
    }
    res(true)
  })))
}

const write = (file: string, text: string): Promise<boolean> => {
  return (new Promise((res, rej) => {
    node_write_file(resolve(file), text, err => {
      if (err) return rej(err)
      res(true)
    })
  }))
}

const create_dot_folder = async (dir: string): Promise<NGMDot> => {

  console.log(yellow('  Indexing...'))

  await mkdir(dir, `./${ngm_dir}`)
  const folders = await index_fs(dir)

  const modules: Module[] = await Promise.all(folders.map(folder => index_repo(folder)))

  const ngm_dot: NGMDot = {
    modules,
    module_map: modules.reduce((acc, mod) => ({
      ...acc,
      [mod.id]: mod
    }), {}),
    projects: [],
    project_map: {}
  }

  await write(resolve(dir, `./${ngm_dir}`, map_file), JSON.stringify(ngm_dot, null, 2))

  return ngm_dot

}

export default async (dir: string): Promise<NGMDot> => {
  return (new Promise<NGMDot>((res, rej) => {
    access(resolve(dir, `./${ngm_dir}`), (err) => {
      if (err) {
        if (err.code === 'ENOENT')
          return create_dot_folder(resolve(dir)).then(res)
          
        return rej(err)
      }

      readFile(resolve(dir, `./${ngm_dir}`, map_file), (err, data) => {
        if (err) {
          if (err.code === 'ENOENT')
            return create_dot_folder(resolve(dir)).then(res)

          return rej(err)
        }
        res(JSON.parse(`${data}`))
      })
    })
  }))
}
