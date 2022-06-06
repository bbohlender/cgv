import { ParsedSteps } from "../parser"
import {} from "diff"

type LinearizedStep =
    | (ParsedSteps & {
          type: Exclude<ParsedSteps["type"], "random" | "if" | "sequential" | "parallel" | "switch" | "symbol">
      })
    | { type: "filter-conditional"; condition: ParsedSteps }
    | { type: "filter-random"; probability: number }

type LinearizedSteps = Array<LinearizedStep>

export function linearize(step: ParsedSteps): Array<LinearizedSteps> {}

//TODO: create score
export function combineLinearization(steps1: LinearizedSteps, steps2: LinearizedSteps): LinearizedSteps {}

export function delinearize(linearizations: Array<LinearizedSteps>): ParsedSteps {}
