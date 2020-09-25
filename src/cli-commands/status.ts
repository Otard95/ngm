import { print_status } from "../git-commands/status";
import { CommandFn } from ".";

const status_command: CommandFn = async (api, context) => print_status(api.status({project_id: context.project_id}))
export default status_command