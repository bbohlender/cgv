import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorResult, Selections } from "."
import { Draft, original, produce, current } from "immer"
import { translateSelectionsForStep } from "./selection"
import { getAtPath, HierarchicalInfo, HierarchicalParsedSteps, setAtPath, TranslatedPath, translatePath } from "../util"

export function replace(
    selections: Selections,
    replaceWith: (
        draft: Draft<ParsedSteps>,
        path: HierarchicalPath,
        translatedPath: TranslatedPath<HierarchicalInfo>
    ) => Draft<ParsedSteps> | void,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    //TODO: generic solution (together with insert) for simplification (e.g. flatten)
    return produce({ grammar, selections: [] as Selections }, ({ grammar: draft, selections: newSelections }) => {
        for (const selection of selections) {
            const arrayPath = selection.steps.path
            const translatedPath = translatePath(draft, arrayPath)
            if (translatedPath == null) {
                continue
            }

            const currentSteps: Draft<HierarchicalParsedSteps> = getAtPath(translatedPath, arrayPath.length - 1)

            const newSteps = replaceWith(currentSteps, arrayPath, translatedPath) ?? currentSteps
            const oldSteps = original(currentSteps)!
            const translatedSteps = translateSelectionsForStep(
                selection.selectedIndices,
                selection.allIndices,
                newSteps,
                oldSteps
            )

            setAtPath(arrayPath, translatedPath, arrayPath.length - 1, translatedSteps)

            newSelections.push({
                steps: newSteps as HierarchicalParsedSteps,
            })
        }
    })
}
