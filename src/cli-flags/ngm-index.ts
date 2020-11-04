import { relative } from 'path'
import chalk from 'chalk'
import { isString, map } from 'lodash'
import { diffLines } from 'diff'
import NGMApi from '../api'
import { CLIContext } from '../cli'
import { CLIOpts } from '../interfaces/cli'
import { Repository } from '../interfaces/ngm-dot'
import { intersect } from '../utils/array'
import displayProcess from '../utils/display-process'

const repository_to_text = (repo: Repository) => [
  `    ID: ${repo.id}`,
  `Url: ${repo.url}`,
  `Branches:`,
  ...repo.branches.map(b => `  ${b}`),
  `Remotes:`,
  ...map(repo.remote, (val, key) => `  ${key} -> ${val}`),
].join('\n    ')

const create_repository_diff = (change: [Repository, Repository]) => diffLines(
  repository_to_text(change[0]),
  repository_to_text(change[1]),
  { newlineIsToken: false }
).map(c => (c.added ? chalk.green : c.removed ? chalk.red : chalk.gray)(c.value)).join('')


const opts: CLIOpts<CLIContext> = [99, async (context, args, next) => {

  const flags = intersect(args, ['-i', '--index'])
  if (flags.length > 0) {
    const api = await NGMApi.Init(context.ngm_dot)

    const changes = await displayProcess('Indexing', api.re_index())
    if (flags.includes('--index')) {
      if ([...changes.created, ...changes.removed, ...changes.changed].length > 0)
        console.log(
          [
            (changes.removed.length > 0) && chalk.red('Removed Repositories'),
            ...(changes.removed.map(p => '  '+relative(process.cwd(), p.path))),
            (changes.created.length > 0) && chalk.green('Added Repositories'),
            ...(changes.created.map(p => '  '+relative(process.cwd(), p.path))),
            (changes.changed.length > 0) && chalk.yellow('Changed Repositories'),
            ...(changes.changed.map(p => '  '+relative(process.cwd(), p[0].path).concat('\n', ...create_repository_diff(p)))),
          ].filter(isString).map(s => `  ${s}`).join('\n'),
          '\n'
        )
      else
        console.log('  No Changes\n')
    }

    context.ngm_dot = api.NGMDot
  }

  flags.forEach(f => args.splice(args.indexOf(f), 1))

  next()

}, ['i', 'index', 'Re-index repositories. Show changes with --index ']]
export default opts
