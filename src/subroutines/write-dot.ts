import { writeFile as node_write_file } from 'fs'
import { resolve } from 'path'
import { NGMDot } from '../interfaces/ngm-dot'
import { map_file, ngm_dir } from '../utils/constants'

const write = (file: string, text: string): Promise<boolean> => {
  return (new Promise((res, rej) => {
    node_write_file(resolve(file), text, err => {
      if (err) return rej(err)
      res(true)
    })
  }))
}

const write_dot = async (ngm_dot: NGMDot) => await write(resolve(process.cwd(), `./${ngm_dir}`, map_file), JSON.stringify(ngm_dot, null, 2))
export default write_dot