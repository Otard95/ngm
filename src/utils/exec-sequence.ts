
export type SequenceFunc<C extends {}> = (context: C, args: string[], next: () => void, err: (message: string) => void, done: () => void) => PromiseLike<void> | void

export default class ExecSequence<C extends {}> {

  private funcs: Record<string, SequenceFunc<C>[]> = {}

  public push(fn: SequenceFunc<C>, priority = 0) {
    if (!Array.isArray(this.funcs[`${priority}`]))
      this.funcs[`${priority}`] = []

    this.funcs[`${priority}`].push(fn)
    return this
  }

  public async exec(context: C, args: string[] = []): Promise<[C, string[]]> {

    const funcs = Object.keys(this.funcs)
      .sort()
      .reverse()
      .reduce<SequenceFunc<C>[]>((acc, key) => {
        return [...acc, ...this.funcs[key]]
      }, [])

    let done = false
    while (!done && funcs.length > 0) {

      const fn = funcs.shift()
      if (!fn) continue

      await new Promise((res, rej) => {
        fn(context, args, res as () => void, rej, () => {
          done = true
          res(undefined)
        })
      })

    }

    return [context, args]

  }

}
