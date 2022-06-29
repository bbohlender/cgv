import { HierarchicalPath, ParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import type { EditorState } from "."
import { Draft, freeze, original, produce } from "immer"
import { PatternSelector, getMatchingCondition, PatternType } from "./pattern"
import {
    computeDependencies,
    getAtPath,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    setAtPath,
    TranslatedPath,
    translatePath,
} from "../util"
import { ValueMap, SelectedSteps, SelectionsList } from "./selection"
import { findSymbolsWithIdentifier } from "./noun"
import { Value } from "../interpreter"

export function getSelectedStepsUpwardsPaths(
    steps: SelectedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Array<HierarchicalPath> {
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

export async function replace<T>(
    valueMap: ValueMap<T>,
    selectionsList: SelectionsList<T>,
    patterns: Array<PatternType<T>>,
    selectCondition: PatternSelector,
    replaceWith: ReplaceWith,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const partial = await produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelections }) =>
            replaceOnDraft(valueMap, selectionsList, patterns, selectCondition, replaceWith, draft, newSelections)
    )

    return {
        ...partial,
        dependencyMap: computeDependencies(partial.grammar),
        hovered: undefined,
    }
}

export async function replaceOnDraft<T>(
    valueMap: ValueMap<T>,
    selectionsList: SelectionsList<T>,
    patterns: Array<PatternType<T>>,
    selectCondition: PatternSelector,
    replaceWith: ReplaceWith,
    grammar: HierarchicalParsedGrammarDefinition,
    newSelectionsList?: SelectionsList
) {
    for (const { values, steps, generatePatternCondition } of selectionsList) {
        for (const path of getSelectedStepsUpwardsPaths(steps, grammar)) {
            const joinedPath = path.join(",")
            const all = valueMap[joinedPath] ?? []
            const translatedPath = translatePath(grammar, path)
            if (translatedPath == null) {
                continue
            }
            await replaceAtPathOnDraft(
                all.map(({ before }) => before),
                values.map(({ before }) => before),
                patterns,
                selectCondition,
                replaceWith,
                path,
                translatedPath,
                newSelectionsList,
                generatePatternCondition
            )
        }
    }
}

export type ReplaceWith = (
    draft: Draft<ParsedSteps>,
    path: HierarchicalPath,
    translatedPath: TranslatedPath<HierarchicalInfo>
) => Draft<ParsedSteps> | undefined

export async function replaceAtPathOnDraft<T>(
    all: Array<Value<T>>,
    selected: Array<Value<T>>,
    patterns: Array<PatternType<T>>,
    selectCondition: PatternSelector,
    replaceWith: ReplaceWith,
    path: HierarchicalPath,
    translatedPath: TranslatedPath<HierarchicalInfo>,
    newSelectionsList: SelectionsList | undefined,
    generatePatternCondition: (() => ParsedSteps) | undefined
): Promise<void> {
    if (all.length > 0 && selected.length === 0) {
        return
    }
    const currentSteps: Draft<HierarchicalParsedSteps> = getAtPath(translatedPath, path.length - 1)

    const newSteps = replaceWith(currentSteps, path, translatedPath) ?? currentSteps
    const oldSteps = original(currentSteps)!
    const generateCondition =
        generatePatternCondition ?? (await getMatchingCondition(all, selected, patterns, selectCondition))?.generateStep

    const translatedSteps: ParsedSteps =
        generateCondition == null ? newSteps : { type: "if", children: [generateCondition(), newSteps, oldSteps] }

    setAtPath(path, translatedPath, path.length - 1, translatedSteps)

    const resultSteps = newSteps as HierarchicalParsedSteps

    newSelectionsList?.push({
        steps: freeze(resultSteps),
        values: [],
    })
}
