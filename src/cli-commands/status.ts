import { print_status } from "../git-commands/status";
import { CommandFn } from ".";

const status_command: CommandFn = async (api, context) => print_status(api.status(context))
export default status_command