import { RepositoryId, NGMDot, Project, ProjectId } from "./interfaces/ngm-dot"
import read_dot from "./subroutines/read-dot"
import { status } from "./git-commands"
import { RepositoryWithStatus } from "./interfaces/status"
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

  public status(args: StatusArgs): Promise<RepositoryWithStatus[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    return status(ngm_dot.repositories)
  }

  public async project_create(name: string, branch: string) {

    if (this.ngm_dot.projects.find(p => p.name === name)) throw new Error('That project already exists')

    const partial_project: SomePartial<Project, 'id'> = {
      name,
      branch,
      repository_ids: []
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

  public async project_add(proj_id: ProjectId, ...repository_ids: RepositoryId[]) {

    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (repository_ids.some(mid => !Boolean(this.ngm_dot.repository_map[mid]))) throw new Error('One or more invalid repository ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.repository_ids = [...project.repository_ids, ...repository_ids].filter((v,i,a) => a.indexOf(v) === i)

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    if (!await write_dot(ngm_dot)) throw new Error('Failed to add repositories. Could not write dot file')

  }

  public async project_remove(proj_id: string, ...repository_ids: string[]) {
    
    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (repository_ids.some(mid => !Boolean(this.ngm_dot.repository_map[mid]))) throw new Error('One or more invalid repository ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.repository_ids = project.repository_ids.filter(mid => !repository_ids.includes(mid))

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    if (!await write_dot(ngm_dot)) throw new Error('Failed to remove repositories. Could not write dot file')

  }

}

export default NGMApi
