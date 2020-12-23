import { CommandFn } from ".";
import GitError from "../git-commands/common/git-error";
import { print_push, PushInfo } from "../git-commands/push";
import displayProcess from "../utils/display-process";

const push_command: CommandFn = async (api, context) =>
  print_push(await api.push(context, p => displayProcess<PushInfo, GitError>(...p)))
export default push_command