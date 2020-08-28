import { readdir, Dirent } from 'fs'
import { resolve } from 'path'

const index_fs = (dir: string, ...sub_dir: string[]): Promise<string[]> => {

  return (new Promise<string[]>((res, rej) => {
    const path = resolve(dir, ...sub_dir)
    
    readdir(path, { withFileTypes: true }, async (err, dirents: Dirent[]) => {

      if (err) return rej(err)

      let folders = dirents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)

      const is_repo = folders.includes('.git')

      folders = folders.filter(v => !v.startsWith('.'))

      const sub_repos = (await Promise.all(
        folders.map((folder) => index_fs(path, folder))
      )).reduce((acc, folders) => ([...acc, ...folders]), [])

      if (is_repo)
        res([ path, ...sub_repos ])
      else
        res(sub_repos)

    })

  }))

}

export default index_fs
