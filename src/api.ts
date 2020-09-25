import { ModuleId, NGMDot, Project, ProjectId } from "./interfaces/ngm-dot"
import read_dot from "./subroutines/read-dot"
import { status } from "./git-commands"
import { ModuleWithStatus } from "./interfaces/status"
import { createHash } from "crypto"
import write_dot from "./subroutines/write-dot"

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

  public async project_create(name: string, branch: string) {

    if (this.ngm_dot.projects.find(p => p.name === name)) throw new Error('That project already exists')

    const partial_project: SomePartial<Project, 'id'> = {
      name,
      branch,
      modules_ids: []
    }
    const project: Project = {
      id: createHash('md5').update(JSON.stringify(partial_project)).digest('hex'),
      ...partial_project
    }

    const ngm_dot = {...this.ngm_dot}

    ngm_dot.project_map[project.id] = project
    ngm_dot.projects.push(project)

    if (!await write_dot(ngm_dot)) throw new Error('Failed to create project. Could not write dot file')

  }

  public async project_add(proj_id: ProjectId, ...module_ids: ModuleId[]) {

    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (module_ids.some(mid => !Boolean(this.ngm_dot.module_map[mid]))) throw new Error('One or more invalid module ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.modules_ids = [...project.modules_ids, ...module_ids].filter((v,i,a) => a.indexOf(v) === i)

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    if (!await write_dot(ngm_dot)) throw new Error('Failed to add modules. Could not write dot file')

  }

  public async project_remove(proj_id: string, ...module_ids: string[]) {
    
    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (module_ids.some(mid => !Boolean(this.ngm_dot.module_map[mid]))) throw new Error('One or more invalid module ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.modules_ids = project.modules_ids.filter(mid => !module_ids.includes(mid))

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    if (!await write_dot(ngm_dot)) throw new Error('Failed to remove modules. Could not write dot file')

  }

}

export default NGMApi
