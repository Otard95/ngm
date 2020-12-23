import { CommandFn } from ".";
import { print_pull } from "../git-commands/pull";
import displayProcess from "../utils/display-process";

const pull_command: CommandFn = async (api, context) =>
  print_pull(await api.pull(context, p => displayProcess(...p)))
export default pull_command