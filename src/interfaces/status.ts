import { Repository } from "./ngm-dot";

export interface GitStatus {
  has_changes: boolean
  staged: {
    modified?: string[]
    added?: string[]
    deleted?: string[]
    renamed?: [string, string][]
    copied?: string[]
    unmerged?: string[]
  }
  unstaged: {
    modified?: string[]
    deleted?: string[]
    renamed?: [string, string][]
    copied?: string[]
    unmerged?: string[]
  }
  untracked?: string[]
  head: {
    ahead: number
    behind: number
    upstream: boolean
  }
}

export type RepositoryWithBranch = Repository & {
  current_branch: string
}

export type RepositoryWithStatus<R = Repository> = R & RepositoryWithBranch & {
  status: GitStatus
}
