import { CLIOpts } from "../interfaces/cli"
import addHelp from "./help"

const init_flags = <C>(): CLIOpts<C> => {
  const opts: CLIOpts<C> = []

  return addHelp(opts)
}
export default init_flags