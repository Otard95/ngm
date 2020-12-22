import NGMApi from "../api"
import { CLIContext } from "../cli"
import { SequenceFunc } from "../utils/exec-sequence"

import project_command, { args_parser as project_args_parser } from "./project"
import status_command from "./status"
import pull_command from "./pull"
import test_command from "./test"
import push_command from "./push"
import checkout_command from "./checkout"

export type CommandFn = (api: NGMApi, context: CLIContext) => PromiseLike<void> | void
export type CommandHandlers = { cmd: CommandFn, cmd_arg_parser?: SequenceFunc<CLIContext>}

const init_commands = () => {
  const commands = new Map<string, CommandHandlers>()

  commands.set('status', { cmd: status_command })
  commands.set('pull', { cmd: pull_command })
  commands.set('push', { cmd: push_command })
  commands.set('checkout', { cmd: checkout_command })
  commands.set('test', { cmd: test_command })
  commands.set('project', { cmd: project_command, cmd_arg_parser: project_args_parser })

  return commands
}
export default init_commands