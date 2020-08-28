import read_dot from './subroutines/read-dot'
import Context from './utils/context'
import * as commands from './commands'

const main = async () => {

  Context.dot = await read_dot(process.cwd())

  commands.status()

}

main()
