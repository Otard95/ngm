import { Repository } from "../../interfaces/ngm-dot"

export default class GitError extends Error {
  public repository: Repository
  constructor(message: string, repo: Repository) {
    super(message)
    this.repository = repo
  }
}