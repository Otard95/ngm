import { Module } from "./ngm-dot";

export interface GitStatus {
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

export type ModuleWithStatus = Module & {
  status: GitStatus
}
