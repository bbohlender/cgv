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

export function translateSelections(
    selections: Selections,
    getNewSteps: (path: HierarchicalPath) => ParsedSteps,
    getOldSteps: (path: HierarchicalPath) => ParsedSteps | undefined
): Array<{ path: HierarchicalPath; steps: ParsedSteps }> {
    //TODO: special cases with parallel and sequential
    return selections.map((selection) => {
        const arrayPath = getPathFromSelection(selection)
        return {
            path: arrayPath,
            steps: translateSelectionsForStep(arrayPath, selection.indices, getNewSteps, getOldSteps),
        }
    })
}

export function getPathFromSelection({ path }: Selection): HierarchicalPath {
    if (typeof path === "string") {
        return [path]
    }
    return path
}

function translateSelectionsForStep(
    path: HierarchicalPath,
    indices: Array<Array<number>> | undefined,
    getNewSteps: (path: HierarchicalPath) => ParsedSteps,
    getOldSteps: (path: HierarchicalPath) => ParsedSteps | undefined
): ParsedSteps {
    const newSteps = getNewSteps(path)
    const oldSteps = getOldSteps(path)
    //TODO: find groups
    //TODO: find pattern
    //TODO: translate pattern to ParsedSteps
    throw new Error("method not implemented")
}
