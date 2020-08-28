import { SequenceFunc } from "../utils/exec-sequence"

const usage = `usage: ngm <COMMAND> [OPTIONS]

  OPTIONS

    -h | --help\tShow this...

  COMMANDS

    status\tDisplay the status of all repositories
`

const help_command: SequenceFunc = async (_next, _err, done) => {
  console.log(usage)
  done()
}
export default help_command