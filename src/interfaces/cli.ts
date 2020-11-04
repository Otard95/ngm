import { SequenceFunc } from "../utils/exec-sequence"

type ShortFlag = string
type LongFlag = string
type Description = string
type Priority = number

export type HelpInfo = [ShortFlag, LongFlag, Description] | [ShortFlag, Description]

export type CLIOpts<C> = [Priority, SequenceFunc<C>, HelpInfo]
