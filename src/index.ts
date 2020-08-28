import { print_status } from './commands/status'
import NGMApi from './api'

const main = async () => {

  await NGMApi.Init(process.cwd())

  print_status(await NGMApi.Instance.status())

}

main()
