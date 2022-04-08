import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { HierarchicalParsedSteps, HierarchicalPath } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

export type Selections = Array<Selection>
/**
 * index = undefined - means everything is selected
 */
export type Selection = { steps: HierarchicalParsedSteps; indices: Array<Array<number>> | undefined }

export function translateSelectionsForStep(
    path: HierarchicalPath,
    indices: Array<Array<number>> | undefined,
    newSteps: ParsedSteps,
    oldSteps: ParsedSteps
): ParsedSteps {
    if (indices == null) {
        return newSteps
    }
    //TODO: find groups
    //TODO: find pattern
    //TODO: translate pattern to ParsedSteps
    throw new Error("method not implemented")
}
