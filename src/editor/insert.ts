import produce from "immer"
import { ConditionSelector, EditorState, SelectionPattern } from "."
import {
    getAtPath,
    HierarchicalInfo,
    setAtPath,
    translatePath,
    ParsedSteps,
    HierarchicalParsedGrammarDefinition,
    HierarchicalPath,
    getSelectionCondition,
} from ".."
import { computeDependencies, HierarchicalParsedSteps } from "../util"
import { getSelectedStepsUpwardsPaths } from "./replace"
import { getSelectedStepsPath, ValueMap, SelectionsList } from "./selection"

export async function insert<T, A>(
    valueMap: ValueMap<T, A>,
    selectionsList: SelectionsList<T, A>,
    patterns: Array<SelectionPattern<T, A>>,
    selectCondition: ConditionSelector,
    position: "before" | "after" | "parallel",
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const partial = await produce(
        { grammar, selectionsList: [] as SelectionsList },
        async ({ grammar: draft, selectionsList: newSelections }) => {
            const type = position === "parallel" ? "parallel" : "sequential"
            for (const { values, steps } of selectionsList) {
                const paths =
                    position === "after" ? [getSelectedStepsPath(steps)] : getSelectedStepsUpwardsPaths(steps, grammar)
                for (const path of paths) {
                    const joinedPath = path.join(",")
                    const all = valueMap[joinedPath] ?? []

                    if (all.length > 0 && values.length === 0) {
                        return
                    }

                    const translatedPath = translatePath<HierarchicalInfo>(draft, path)
                    if (translatedPath == null) {
                        continue
                    }

                    const newSteps = stepGenerator(path)
                    const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
                    const selector = position === "parallel" ? "before" : position
                    const selectedCondition = await getSelectionCondition(
                        all.map((value) => value[selector]),
                        values.map((value) => value[selector]),
                        patterns,
                        selectCondition
                    )

                    const translatedSteps: ParsedSteps =
                        selectedCondition == null
                            ? newSteps
                            : { type: "if", children: [selectedCondition, newSteps, oldSteps] }

                    const current = getAtPath(translatedPath, path.length - 1)
                    setAtPath(path, translatedPath, path.length - 1, {
                        type,
                        children: position === "before" ? [translatedSteps, current] : [current, translatedSteps],
                    })

                    const resultSteps = newSteps as HierarchicalParsedSteps

                    newSelections.push({
                        steps: resultSteps,
                        values: [],
                    })
                }
            }
        }
    )
    return {
        ...partial,
        valueMap: {},
        hovered: undefined,
        dependencyMap: computeDependencies(partial.grammar),
    }
}
