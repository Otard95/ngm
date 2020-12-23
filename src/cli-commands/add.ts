import { CommandFn } from ".";
import { print_add } from "../git-commands/add";
import displayProcess from "../utils/display-process";

const add_command: CommandFn = async (api, context) =>
  print_add(await api.add(context, p => displayProcess(...p)))
export default add_command