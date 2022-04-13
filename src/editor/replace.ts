import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorState } from "."
import { Draft, original, produce } from "immer"
import { translateSelectionsForStep } from "./selection"
import { getAtPath, HierarchicalInfo, HierarchicalParsedSteps, setAtPath, TranslatedPath, translatePath } from "../util"
import { IndicesMap } from "./indices"

export function replace(
    indicesMap: IndicesMap,
    selectionsMap: IndicesMap,
    replaceWith: (
        draft: Draft<ParsedSteps>,
        path: HierarchicalPath,
        translatedPath: TranslatedPath<HierarchicalInfo>
    ) => Draft<ParsedSteps> | void,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with insert) for simplification (e.g. flatten)
    return produce({ grammar, selectionsMap: {} as IndicesMap }, ({ grammar: draft, selectionsMap: newSelections }) => {
        for (const [id, selectedIndices] of Object.entries(selectionsMap)) {
            const allIndices = indicesMap[id]
            if (selectedIndices == null || allIndices == null) {
                continue
            }
            const arrayPath = id.split(",").map((val, i) => (i === 0 ? val : parseInt(val))) as HierarchicalPath

            const translatedPath = translatePath(draft, arrayPath)
            if (translatedPath == null) {
                continue
            }

            const currentSteps: Draft<HierarchicalParsedSteps> = getAtPath(translatedPath, arrayPath.length - 1)

            const newSteps = replaceWith(currentSteps, arrayPath, translatedPath) ?? currentSteps
            const oldSteps = original(currentSteps)!
            const translatedSteps = translateSelectionsForStep(allIndices, selectedIndices, newSteps, oldSteps)

            setAtPath(arrayPath, translatedPath, arrayPath.length - 1, translatedSteps)

            newSelections[id] = []
        }
    })
}
