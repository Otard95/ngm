import NGMApi from "../api"
import { CLIContext } from "../cli"
import status_command from "./status"

export type CommandFn = (api: NGMApi, context: CLIContext) => PromiseLike<void> | void

const init_commands = () => {
  const commands = new Map<string, CommandFn>()

  commands.set('status', status_command)

  return commands
}
export default init_commands