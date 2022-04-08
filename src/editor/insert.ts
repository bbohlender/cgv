import produce from "immer"
import { EditorResult, Selections } from "."
import {
    getAtPath,
    HierarchicalInfo,
    setAtPath,
    translatePath,
    ParsedSteps,
    HierarchicalParsedGrammarDefinition,
    HierarchicalPath,
    translateSelectionsForStep,
} from ".."

export function insert(
    position: "before" | "after" | "parallel",
    selections: Selections,
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    const type = position === "parallel" ? "parallel" : "sequential"
    const result = produce(grammar, (draft) => {
        for (const selection of selections) {
            const arrayPath = selection.steps.path
            const newSteps = stepGenerator(arrayPath)
            const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
            const steps = translateSelectionsForStep(arrayPath, selection.indices, newSteps, oldSteps)
            const translatedPath = translatePath<HierarchicalInfo>(draft, arrayPath)
            if (translatedPath == null) {
                continue
            }
            const current = getAtPath(translatedPath, arrayPath.length - 1)
            setAtPath(arrayPath, translatedPath, arrayPath.length - 1, {
                type,
                children: position === "before" ? [steps, current] : [current, steps],
            })
            const insertIndex = position === "before" ? 0 : 1
            /*if (path.length > 1) {
                const parent = getAtPath(translatedPath, path.length - 2)
                const parentPath = path.slice(0, -1) as HierarchicalPath
                const childIndex = path[path.length - 1] as number
                const flattened = flatten(parent, childIndex)
                if (flattened) {
                    newSelections.push({
                        indices: undefined,
                        path: [...parentPath, childIndex + insertIndex],
                    })
                    continue
                }
            }

            newSelections.push({
                indices: undefined,
                path: [...path, insertIndex],
            })*/
        }
    })

    //TODO: generic solution (together with remove) for simplification (e.g. flatten) while remapping the selections

    return {
        grammar: result,
        selections: [],
    }
}
