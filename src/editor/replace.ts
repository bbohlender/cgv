import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorState } from "."
import { Draft, original, produce } from "immer"
import { translateSelectionsForStep } from "./pattern"
import { getAtPath, HierarchicalInfo, HierarchicalParsedSteps, setAtPath, TranslatedPath, translatePath } from "../util"
import { IndicesMap, SelectionsList } from "./selection"

export function replaceSubset(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    isInSubset: (selections: SelectionsList[number]) => boolean,
    replaceWith: (
        draft: Draft<ParsedSteps>,
        path: HierarchicalPath,
        translatedPath: TranslatedPath<HierarchicalInfo>
    ) => Draft<ParsedSteps> | void,
    grammar: HierarchicalParsedGrammarDefinition
) {
    const unchangedSelectionsList: SelectionsList = []
    const subsetSelectionsList: SelectionsList = []
    for (const selections of selectionsList) {
        if (isInSubset(selections)) {
            subsetSelectionsList.push({ ...selections, fill: true })
        } else {
            unchangedSelectionsList.push({ ...selections, fill: false })
        }
    }
    const { selectionsList: changedSelectionsList, ...state } = replace(
        indicesMap,
        subsetSelectionsList,
        replaceWith,
        grammar
    )
    return { ...state, selectionsList: unchangedSelectionsList.concat(changedSelectionsList) }
}

export function replace(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    replaceWith: (
        draft: Draft<ParsedSteps>,
        path: HierarchicalPath,
        translatedPath: TranslatedPath<HierarchicalInfo>
    ) => Draft<ParsedSteps> | void,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with insert) for simplification (e.g. flatten)
    const partial = produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelections }) => {
            for (const { indices, steps } of selectionsList) {
                const path = steps.path.join(",")
                const all = indicesMap[path] ?? []

                const translatedPath = translatePath(draft, steps.path)
                if (translatedPath == null) {
                    continue
                }

                const currentSteps: Draft<HierarchicalParsedSteps> = getAtPath(translatedPath, steps.path.length - 1)

                const newSteps = replaceWith(currentSteps, steps.path, translatedPath) ?? currentSteps
                const oldSteps = original(currentSteps)!
                const translatedSteps = translateSelectionsForStep(all, indices, "before", newSteps, oldSteps)

                setAtPath(steps.path, translatedPath, steps.path.length - 1, translatedSteps)

                const resultSteps = newSteps as HierarchicalParsedSteps

                newSelections.push({
                    steps: resultSteps,
                    indices: [],
                    fill: true,
                })
            }
        }
    )
    return {
        ...partial,
        indicesMap: {},
        hovered: undefined,
    }
}
