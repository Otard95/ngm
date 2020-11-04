import { CLIContext } from "../cli"
import { CLIOpts } from "../interfaces/cli"
import addHelp from "./help"
import ngm_index from './ngm-index'

const init_flags = <C extends CLIContext> (): CLIOpts<C>[] => {
  const opts: CLIOpts<C>[] = []

  opts.push(ngm_index)

  return addHelp(opts)
}
export default init_flags