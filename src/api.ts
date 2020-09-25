import { NGMDot, ProjectId } from "./interfaces/ngm-dot"
import read_dot from "./subroutines/read-dot"
import { status } from "./git-commands"
import { ModuleWithStatus } from "./interfaces/status"

interface StatusArgs {
  project_id?: ProjectId
}

class NGMApi {

  private static _instance?: NGMApi

  private ngm_dot: NGMDot

  public static get Instance() {
    if (!this._instance) throw new Error('You must call and wait for NGMApi::Init() to resolve before you can call this')
    return this._instance
  }

  public static async Init(root: string | NGMDot) {
    this._instance = new NGMApi(
      typeof root === 'string'
        ? await read_dot(root)
        : root
    )
    return this._instance
  }

  private constructor(ngm_dot: NGMDot) {
    this.ngm_dot = ngm_dot
  }

  public status(args: StatusArgs): Promise<ModuleWithStatus[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.modules.filter(m => project.modules_ids.includes(m.id))
    }
    return status(ngm_dot.modules)
  }

}

export default NGMApi
