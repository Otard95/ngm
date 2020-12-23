import { CommandFn } from ".";
import { print_checkout } from "../git-commands/checkout";
import displayProcess from "../utils/display-process";
// import checkout, { print_checkout } from "../git-commands/checkout";

const checkout_command: CommandFn = async (api, context) =>
  print_checkout(await api.checkout(context, (a) => displayProcess(...a)))
export default checkout_command