type ModuleId = string
type ProjectId = string
export interface Module {
  id: ModuleId
  path: string // Full path
  remote: Record<string, string> // git remote address
  branch: string // The current branch
  url: string // Bitbucket url
}
export interface Project {
  id: ProjectId
  branch: string // Working branch for tye task
  modules_ids: ModuleId[]
}
export interface NGMDot {
  modules: Module[]
  module_map: Record<ModuleId, Module>
  projects: Project[]
  project_map: Record<ProjectId, Project>
}
