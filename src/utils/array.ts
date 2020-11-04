import { partial } from "lodash"

const intersect_default_eqfn = (a: any,b: any)=>a===b
/**
 * Given two arrays and and optional equality function, this returns a new array containing the elements of arr1 also found in arr2
 * 
 * @param arr1 Array 1
 * @param arr2 Array 2
 * @param eqfn A function to test equality of the elements in the arrays
 */
export const intersect = <T, U = T>(arr1: T[], arr2: U[], eqfn: (a: T, b: U) => boolean = intersect_default_eqfn): T[] => {
  return arr1.filter(v => arr2.findIndex(partial(eqfn, v)) > -1)
}
