export type RepositoryId = string // hash
export type ProjectId = string // hash
export interface Repository {
  id: RepositoryId
  path: string // Full path
  remote: Record<string, string> // git remote address
  branch: string // The current branch
  url: string // Bitbucket url
}
export interface Project {
  id: ProjectId
  name: string
  branch: string // Working branch for tye task
  repository_ids: RepositoryId[]
}
export interface NGMDot {
  repositories: Repository[]
  repository_map: Record<RepositoryId, Repository>
  projects: Project[]
  project_map: Record<ProjectId, Project>
}
