import { CommandFn } from ".";
import push, { print_push } from "../git-commands/push";

const push_command: CommandFn = async (_api, context) => {

  const ngm_dot = {...context.ngm_dot}
  if (context.project_id) {
    const project = ngm_dot.project_map[context.project_id]
    if (project)
      ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
  }
  print_push(push(ngm_dot.repositories, context.git_args))

}
export default push_command