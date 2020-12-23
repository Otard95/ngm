
export type TrackablePromise<R> = Promise<R> & {
  resolved: boolean
  rejected: boolean
  pending: boolean
}
export const makeTrackablePromise = <R>(promise: Promise<R>): TrackablePromise<R> => {

  const trackable = (promise as TrackablePromise<R>)
  trackable.pending = true
  trackable.resolved = false
  trackable.rejected = false

  trackable
    .then(res => {
      trackable.pending = false
      trackable.resolved = true
      return res
    }).catch(err => {
      trackable.pending = false
      trackable.rejected = true
      return err
    })

  return trackable

}

export interface PromiseResultOk<R> {
  success: true
  res: R
}
export interface PromiseResultErr<E = Error> {
  success: false
  err: E
}
export type PromiseResult<R, E = Error> = PromiseResultOk<R> | PromiseResultErr<E> 
export const promiseSome = <R, E = Error>(promisees: Promise<R>[]): Promise<PromiseResult<R, E>[]> => {
  return Promise.all(
    promisees.map<Promise<PromiseResult<R, E>>>(async p => {
      try {
        const res = await p
        return { success: true, res }
      } catch (err) {
        return { success: false, err }
      }
    }
  ))
}

export const arrayForEachSequential = async <T>(arr: T[], mapper: (v: T, i: number, arr: T[]) => void): Promise<void> => {

  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    await mapper(v, i, arr)
  }

}
