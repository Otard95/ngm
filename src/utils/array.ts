export const intersect = <T>(arr1: T[], arr2: T[]): T[] => {
  return arr1.filter(v => arr2.includes(v))
}