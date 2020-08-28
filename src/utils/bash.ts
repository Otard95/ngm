import { exec } from 'child_process'
import { isEmpty } from 'lodash'

interface BashOptions {
  cwd?: string
  env?: Record<string, string>
  encoding?: string
}
type BashReturn = [string, number]
interface Bash {
  (command: string, ...params: string[]): Promise<BashReturn>
  (command: string, options: BashOptions, ...params: string[]): Promise<BashReturn>
}

const bash: Bash = async (command: string, ...params: any[]) => {

  let opt: BashOptions = {}
  if (!params) params = []
  if (params.length > 0 && typeof params[0] === 'object') opt = params.shift()

  const cli_params = params.filter(v => typeof v === 'string').join(' ')

  return await (new Promise<BashReturn>((res, rej) => {
    exec(`${command} ${cli_params}`, opt, (err, stdout, stderr) => {
      if (err)
        return rej(err)

      return res([
        (stdout || stderr),
        (!isEmpty(stdout) ? 0 : 1)
      ])

    })
  }))

}

export default bash
