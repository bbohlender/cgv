import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorState } from "."
import { Draft, original, produce } from "immer"
import { translateSelectionsForStep } from "./pattern"
import {
    computeDependencies,
    getAtPath,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    setAtPath,
    TranslatedPath,
    translatePath,
} from "../util"
import { FullIndex, IndicesMap, SelectedSteps, SelectionsList } from "./selection"
import { findSymbolsWithIdentifier } from "./noun"

export function getSelectedStepsUpwardsPaths(
    steps: SelectedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<HierarchicalPath> {
    //TODO: this should be recursive (what is the premise of this function and for what is it used?)
    if (typeof steps === "string") {
        const paths: Array<HierarchicalPath> = []
        for (const { step: rootStep } of grammar) {
            findSymbolsWithIdentifier(rootStep, steps, (symbol) => paths.push(symbol.path))
        }
        return paths
    } else {
        return [steps.path]
    }
}

export function replace(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    replaceWith: ReplaceWith,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const partial = produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelections }) =>
            replaceOnDraft(indicesMap, selectionsList, replaceWith, draft, newSelections)
    )
    return {
        ...partial,
        dependencyMap: computeDependencies(partial.grammar),
        indicesMap: {},
        hovered: undefined,
    }
}

export function replaceOnDraft(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    replaceWith: ReplaceWith,
    grammar: HierarchicalParsedGrammarDefinition,
    newSelectionsList?: SelectionsList
) {
    for (const { indices, steps } of selectionsList) {
        for (const path of getSelectedStepsUpwardsPaths(steps, grammar)) {
            const joinedPath = path.join(",")
            const all = indicesMap[joinedPath] ?? []
            const translatedPath = translatePath(grammar, path)
            if (translatedPath == null) {
                continue
            }
            replaceAtPathOnDraft(all, indices, replaceWith, path, translatedPath, newSelectionsList)
        }
    }
}

export type ReplaceWith = (
    draft: Draft<ParsedSteps>,
    path: HierarchicalPath,
    translatedPath: TranslatedPath<HierarchicalInfo>
) => Draft<ParsedSteps> | undefined

export function replaceAtPathOnDraft(
    all: Array<FullIndex>,
    indices: Array<FullIndex>,
    replaceWith: ReplaceWith,
    path: HierarchicalPath,
    translatedPath: TranslatedPath<HierarchicalInfo>,
    newSelectionsList?: SelectionsList
): void {
    if(all.length > 0 && indices.length === 0) {
        return
    }
    const currentSteps: Draft<HierarchicalParsedSteps> = getAtPath(translatedPath, path.length - 1)

    const newSteps = replaceWith(currentSteps, path, translatedPath) ?? currentSteps
    const oldSteps = original(currentSteps)!
    const translatedSteps = translateSelectionsForStep(all, indices, "before", newSteps, oldSteps)

    setAtPath(path, translatedPath, path.length - 1, translatedSteps)

    const resultSteps = newSteps as HierarchicalParsedSteps

    newSelectionsList?.push({
        steps: resultSteps,
        indices: [],
    })
}
