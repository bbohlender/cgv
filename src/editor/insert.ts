import produce from "immer"
import { EditorResult, Selections, translateSelections } from "."
import { createPathWalker, flatten, ParsedSteps, HierarchicalParsedGrammarDefinition, HierarchicalPath } from ".."

function generateNull(): ParsedSteps {
    return {
        type: "null",
    }
}

function generateThis(): ParsedSteps {
    return {
        type: "this",
    }
}

export function insert(
    position: "before" | "after" | "parallel",
    selections: Selections,
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    const type = position === "parallel" ? "parallel" : "sequential"

    const inserts = translateSelections(selections, stepGenerator, type === "parallel" ? generateNull : generateThis)
    const newSelections: Selections = []
    const result = produce(grammar, (draft) => {
        for (const { path, steps } of inserts) {
            const walker = createPathWalker<any>(draft, path)
            if (!walker.walk(-1)) {
                continue
            }
            const parent = walker.get()
            const parentPath = walker.getPath()
            const childIndex = walker.getNextIndex()
            if (!walker.walk(1)) {
                continue
            }
            const current = walker.get()
            walker.set({
                type,
                children: position === "before" ? [steps, current] : [current, steps],
            })
            const insertIndex = position === "before" ? 0 : 1
            const flattened = flatten(parent, childIndex)
            const newStepPath: HierarchicalPath = flattened
                ? [...parentPath, childIndex + insertIndex]
                : [...parentPath, childIndex, insertIndex]
            newSelections.push({
                indices: undefined,
                path: newStepPath,
            })
        }
    })

    return {
        grammar: result,
        selections: newSelections,
    }
}
