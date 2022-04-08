import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition, setAtPath } from ".."
import type { EditorResult, Selections } from "."
import { getPathFromSelection } from "."
import { Draft, produce } from "immer"
import { translateSelectionsForStep } from "./selection"
import { getAtPath, translatePath } from "../util"

export function replace(
    selections: Selections,
    replaceWith: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    const result = produce(grammar, (draft) => replaceOnDraft(draft, replaceWith, selections))
    return {
        grammar: result,
        selections: [], //TODO
    }
}

export function replaceOnDraft(
    draft: Draft<HierarchicalParsedGrammarDefinition>,
    replaceWith: (path: HierarchicalPath) => ParsedSteps,
    selections: Selections
): void {
    for (const selection of selections) {
        const arrayPath = getPathFromSelection(selection)
        const translatedPath = translatePath(draft, arrayPath)
        if (translatedPath == null) {
            continue
        }
        const newSteps = replaceWith(arrayPath)
        const currentSteps = getAtPath(translatedPath, arrayPath.length - 1)
        const steps = translateSelectionsForStep(arrayPath, selection.indices, newSteps, currentSteps)
        setAtPath(arrayPath, translatedPath, arrayPath.length - 1, steps)
    }
}
