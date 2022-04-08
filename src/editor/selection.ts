import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { HierarchicalPath } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

export type Selections = Array<Selection>
/**
 * index = undefined - means everything is selected
 */
export type Selection = { path: HierarchicalPath | string; indices: Array<Array<number>> | undefined }

export function getPathFromSelection({ path }: Selection): HierarchicalPath {
    if (typeof path === "string") {
        return [path]
    }
    return path
}

export function translateSelectionsForStep(
    path: HierarchicalPath,
    indices: Array<Array<number>> | undefined,
    newSteps: ParsedSteps,
    oldSteps: ParsedSteps
): ParsedSteps {
    //TODO: find groups
    //TODO: find pattern
    //TODO: translate pattern to ParsedSteps
    throw new Error("method not implemented")
}
