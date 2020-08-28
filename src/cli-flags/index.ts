import help_command from "./help"
import { SequenceFunc } from "../utils/exec-sequence"

const init_flags = () => {
  const flags = new Map<string, SequenceFunc>()

  flags.set('-h', help_command)
  flags.set('--help', help_command)

  return flags
}
export default init_flags