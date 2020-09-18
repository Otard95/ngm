import { print_status } from "../git-commands/status";
import { CommandFn } from ".";

const status_command: CommandFn = async api => print_status(api.status({}))
export default status_command