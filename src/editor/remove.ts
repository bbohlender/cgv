import { HierarchicalPath, HierarchicalParsedGrammarDefinition } from ".."
import { Selections, EditorResult } from "."
import { HierarchicalParsedSteps, translatePath } from "../util"
import { insert } from "./insert"
import { replace } from "./replace"

export function isStepRemoveable(path: HierarchicalPath, grammar: HierarchicalParsedGrammarDefinition): boolean {
    const translatedPath = translatePath(grammar, path)
    if (translatedPath == null) {
        return false
    }
    //-2 is okay since translatePath we return an array with at least 2 entries
    for (let i = translatedPath.length - 2; i >= 0; i--) {
        if (i === 0) {
            return true //we assume this is okay (it's probematic f.e.: "a -> 1 + b    b -> 2" to skip step "2" in "b")
        }
        const step = translatedPath[i] as HierarchicalParsedSteps
        switch (step.type) {
            case "sequential":
                return true
            case "parallel":
            case "random":
            case "switch":
                continue
            case "if":
                if (path[i] !== 0) {
                    continue
                }
                return false
            default:
                return false
        }
    }
    return false
}

export function removeValue(selections: Selections, grammar: HierarchicalParsedGrammarDefinition): EditorResult {
    const { grammar: result } = insert("after", selections, () => ({ type: "null" }), grammar)
    return { grammar: result, selections: [] }
}

export function removeStep(selections: Selections, grammar: HierarchicalParsedGrammarDefinition): EditorResult {
    return replace(selections, () => ({ type: "this" }), grammar)
}
