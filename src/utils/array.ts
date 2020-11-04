import { partial } from "lodash"

const intersect_default_eqfn = (a: any,b: any)=>a===b
intersect_default_eqfn.IS_DEFAULT = true
export const intersect = <T>(arr1: T[], arr2: T[], eqfn: (a: T, b: T) => boolean = intersect_default_eqfn): T[] => {
  if ((eqfn as typeof intersect_default_eqfn).IS_DEFAULT) {
    return arr1.filter(v => arr2.findIndex(partial(eqfn, v)) > -1)
  }
  return arr1.filter(v => arr2.includes(v))
}