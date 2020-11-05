import { createHash } from 'crypto'
import { omit } from 'lodash';
import { Repository, RepositoryId } from "../interfaces/ngm-dot";

export const repo_id = (repo: Repository): RepositoryId => {
  const partial_repo = omit(repo, 'id')
  return createHash('md5').update(JSON.stringify(partial_repo)).digest('hex')
}

export const repo_equal = (a: Repository, b: Repository) => repo_id(a) === repo_id(b)
