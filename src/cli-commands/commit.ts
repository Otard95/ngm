import { CommandFn } from ".";
import { print_commit } from "../git-commands/commit";
import displayProcess from "../utils/display-process";

const commit_command: CommandFn = async (api, context) =>
  print_commit(await api.commit(context, p => displayProcess(...p)))
export default commit_command