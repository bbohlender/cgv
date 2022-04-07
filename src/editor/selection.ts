import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, HierarchicalPath } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

export type Selections = Array<Selection>
/**
 * index = undefined - means everything is selected
 */
export type Selection = { path: HierarchicalPath; index: Array<number> | undefined }

export function translateSelections(
    selections: Selections,
    replaceWith: (selected: ParsedSteps) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<{ path: HierarchicalPath; replaceWith: ParsedSteps }> {
    //TODO: special cases with parallel and sequential
    const stepMap = new Map<HierarchicalParsedSteps, Array<Array<number>> | undefined>()
    for (const { path, index } of selections) {
        const key = typeof steps === "string" ? grammar[steps] : steps
        if (key == null) {
            throw new Error(`unknown noun "${steps}"`)
        }
        if (index == null) {
            stepMap.set(key, undefined)
            continue
        }
        let indices = stepMap.get(key)
        if (indices == null) {
            indices = []
            stepMap.set(key, indices)
        }
        indices.push(index)
    }
    return Array.from(stepMap).map(([at, indices]) => ({
        at,
        replaceWith: translateSelectionsForStep(at, indices, replaceWith),
    }))
}

function translateSelectionsForStep(
    steps: HierarchicalParsedSteps,
    indices: Array<Array<number>> | undefined,
    replaceWith: (selected: ParsedSteps) => ParsedSteps
): ParsedSteps {
    const stepToReplace = replaceWith(steps)
    //TODO: find groups
    //TODO: find pattern
    //TODO: translate pattern to ParsedSteps
    throw new Error("method not implemented")
}
