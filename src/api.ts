import { createHash } from "crypto"
import difference from "lodash/difference"

import write_dot from "./subroutines/write-dot"
import index_fs from "./subroutines/index-fs"
import index_repo from './subroutines/index-repo'
import read_dot from "./subroutines/read-dot"
import { bash } from "./utils"
import { repo_equal } from "./utils/repo"

import { RepositoryId, NGMDot, Project, ProjectId, Repository } from "./interfaces/ngm-dot"
import { RepositoryWithStatus } from "./interfaces/status"
import { ProcessInput } from "./utils/display-process"
import { PromiseResult, promiseSome } from "./utils/promise"
import GitError from "./git-commands/common/git-error"

import { status, pull, push, add, checkout } from "./git-commands"
import { PullInfo } from './git-commands/pull'
import { PushInfo } from "./git-commands/push"
import { CheckoutInfo } from "./git-commands/checkout"
import { AddInfo } from "./git-commands/add"

interface GitCommandArgs {
  project_id?: ProjectId
  git_args?: string[]
}
type CliHandoff<T, R> = (a: T) => Promise<R>
type DisplayProcessCliHandoff<I, E = Error> = CliHandoff<ProcessInput<I>[], PromiseResult<I, E>[]>

class NGMApi {

  private static _instance?: NGMApi

  private ngm_dot: NGMDot

  public get NGMDot() { return {...this.ngm_dot} }

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

  public status(args: GitCommandArgs): Promise<RepositoryWithStatus[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    return status(ngm_dot.repositories)
  }

  public pull(
    args: GitCommandArgs,
    cliHandoff?: DisplayProcessCliHandoff<PullInfo, GitError>
  ): Promise<PromiseResult<PullInfo, GitError>[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    const processes = pull(ngm_dot.repositories, args.git_args)
    return cliHandoff
      ? cliHandoff(processes)
      : promiseSome(processes.map(p => p.promise))
  }

  public push(
    args: GitCommandArgs,
    cliHandoff?: DisplayProcessCliHandoff<PushInfo, GitError>
  ): Promise<PromiseResult<PushInfo, GitError>[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    const processes = push(ngm_dot.repositories, args.git_args)
    return cliHandoff
      ? cliHandoff(processes)
      : promiseSome(processes.map(p => p.promise))
  }

  public add(
    args: GitCommandArgs,
    cliHandoff?: DisplayProcessCliHandoff<AddInfo, GitError>
  ): Promise<PromiseResult<AddInfo, GitError>[]> {
    const ngm_dot = {...this.ngm_dot}
    if (args.project_id) {
      const project = ngm_dot.project_map[args.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    const processes = add(ngm_dot.repositories, args.git_args)
    return cliHandoff
      ? cliHandoff(processes)
      : promiseSome(processes.map(p => p.promise))
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

    this.ngm_dot = ngm_dot

  }

  public async project_add(proj_id: ProjectId, ...repository_ids: RepositoryId[]) {

    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (repository_ids.some(mid => !Boolean(this.ngm_dot.repository_map[mid]))) throw new Error('One or more invalid repository ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.repository_ids = [...project.repository_ids, ...repository_ids].filter((v,i,a) => a.indexOf(v) === i)

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    this.ngm_dot = ngm_dot

  }

  public async project_remove(proj_id: string, ...repository_ids: string[]) {
    
    if (!this.ngm_dot.project_map[proj_id]) throw new Error('No project with that id')
    if (repository_ids.some(mid => !Boolean(this.ngm_dot.repository_map[mid]))) throw new Error('One or more invalid repository ids')
    
    const ngm_dot = {...this.ngm_dot}
    const project = ngm_dot.project_map[proj_id]

    project.repository_ids = project.repository_ids.filter(mid => !repository_ids.includes(mid))

    ngm_dot.project_map[proj_id] = project
    ngm_dot.projects.splice(ngm_dot.projects.findIndex(p => p.id === proj_id), 1, project)

    this.ngm_dot = ngm_dot

  }

  private async checkoutSingle(repo_id: RepositoryId, branch: string): ReturnType<typeof bash> {
    
    const repo = this.ngm_dot.repository_map[repo_id]

    if (repo.branches.includes(branch)) {
      return await bash('git', { cwd: repo.path }, 'checkout', branch)
    }

    const res = await bash('git', { cwd: repo.path }, 'checkout', '-b', branch)
    if (res[1] > 1) 
      return res

    repo.branches.push(branch)
    this.ngm_dot.repositories.splice(this.ngm_dot.repositories.findIndex(r => r.id === repo.id), 1, repo)

    return res

  }
  public checkout(repo_id: RepositoryId, branch: string): ReturnType<typeof bash>;
  public checkout(
    args: GitCommandArgs,
    cliHandoff?: DisplayProcessCliHandoff<CheckoutInfo>
  ): Promise<PromiseResult<CheckoutInfo, GitError>[]>;
  public checkout(...args: unknown[]) {

    if (args.length > 2 || args.length === 0)
      throw new Error(`Unexpected number of parameters, got ${args.length} but expected 1 or 2`)

    if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string')
      return this.checkoutSingle(args[0], args[1])

    if (typeof args[0] !== 'object')
      throw new Error(`Argument 1 was of unexpected type. Expected string or RepoFilterArgs, but got ${typeof args[0]}`)
    if (args.length === 2 && typeof args[1] !== 'function')
      throw new Error(`Argument 2 was of unexpected type. Expected string, function or undefined, but got ${typeof args[1]}`)

    const cmdArgs = args[0] as GitCommandArgs
    const cliHandoff = args.length == 2 && args[1] as DisplayProcessCliHandoff<CheckoutInfo>

    const ngm_dot = {...this.ngm_dot}
    if (cmdArgs.project_id) {
      const project = ngm_dot.project_map[cmdArgs.project_id]
      if (project)
        ngm_dot.repositories = ngm_dot.repositories.filter(m => project.repository_ids.includes(m.id))
    }
    const processes = checkout(ngm_dot.repositories, cmdArgs.git_args)
    return cliHandoff
      ? cliHandoff(processes)
      : promiseSome(processes.map(p => p.promise))
    
  }

  public async re_index() {

    const folders = await index_fs(process.cwd())
    const repositories: Repository[] = await Promise.all(folders.map(folder => index_repo(folder)))

    const ngm_dot = {...this.ngm_dot}

    const {
      changed,
      removed
    } = ngm_dot.repositories.reduce<{ changed: [Repository, Repository][], removed: Repository[] }>((acc, repo) => {
      const foundRepo = repositories.find(r => r.path === repo.path)
      if (foundRepo === undefined) {
        acc.removed.push(repo)
      } else if (!repo_equal(foundRepo, repo)) {
        acc.changed.push([repo, foundRepo])
      }
      return acc
    }, { changed: [], removed: [] })
    const created = repositories.filter(r => ngm_dot.repositories.findIndex(fr => r.path === fr.path) === -1)

    const removed_ids = removed.map(r => r.id)
    ngm_dot.projects = ngm_dot.projects.map(p => {
      p.repository_ids = difference(p.repository_ids, removed_ids)
      return p
    })
    ngm_dot.project_map = ngm_dot.projects.reduce((map, p) => ({ ...map, [p.id]: p }), {})

    changed.forEach(c => {
      ngm_dot.repository_map[c[0].id] = c[1]
      ngm_dot.repository_map[c[0].id].id = c[0].id
    })
    ngm_dot.repositories = Object.values(ngm_dot.repository_map)

    this.ngm_dot = ngm_dot

    return { changed, removed, created }

  }

  public async save_dot() {
    return await write_dot(this.ngm_dot)
  }

}

export default NGMApi
