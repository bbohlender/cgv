import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorState } from "."
import { Draft, original, produce } from "immer"
import { translateSelectionsForStep } from "./selection"
import { getAtPath, HierarchicalInfo, HierarchicalParsedSteps, setAtPath, TranslatedPath, translatePath } from "../util"
import { SelectionsMap } from "./indices"

export function replace(
    selectionsMap: SelectionsMap,
    replaceWith: (
        draft: Draft<ParsedSteps>,
        path: HierarchicalPath,
        translatedPath: TranslatedPath<HierarchicalInfo>
    ) => Draft<ParsedSteps> | void,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with insert) for simplification (e.g. flatten)
    return produce(
        { grammar, selectionsMap: {} as SelectionsMap },
        ({ grammar: draft, selectionsMap: newSelections }) => {
            for (const [id, selections] of Object.entries(selectionsMap)) {
                if (selections == null || selections.selected == null) {
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
                const translatedSteps = translateSelectionsForStep(
                    selections.all,
                    selections.selected,
                    newSteps,
                    oldSteps
                )

                setAtPath(arrayPath, translatedPath, arrayPath.length - 1, translatedSteps)

                const resultSteps = newSteps as HierarchicalParsedSteps

                newSelections[resultSteps.path.join(",")] = {
                    all: [],
                    steps: resultSteps,
                    selected: [],
                }
            }
        }
    )
}
