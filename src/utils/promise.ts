
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


export const arrayForEachSequential = async <T>(arr: T[], mapper: (v: T, i: number, arr: T[]) => void): Promise<void> => {

  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    await mapper(v, i, arr)
  }

}
