
export type SequenceFunc = (next: () => void, err: (message: string) => void, done: () => void) => PromiseLike<void> | void

export default class ExecSequence {

  private funcs: SequenceFunc[] = []

  public push(fn: SequenceFunc) {
    this.funcs.push(fn)
    return this
  }

  public async exec(): Promise<void> {

    let done = false
    while (!done && this.funcs.length > 0) {

      const fn = this.funcs.shift()
      if (!fn) continue

      await new Promise((res, rej) => {
        fn(res, rej, () => {
          done = true
          res()
        })
      })

    }

  }

}
