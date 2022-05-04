import produce from "immer"
import { EditorState } from "."
import {
    getAtPath,
    HierarchicalInfo,
    setAtPath,
    translatePath,
    ParsedSteps,
    HierarchicalParsedGrammarDefinition,
    HierarchicalPath,
    translateSelectionsForStep,
} from ".."
import { computeDependencies, HierarchicalParsedSteps } from "../util"
import { getSelectedStepsUpwardsPaths } from "./replace"
import { getSelectedStepsPath, IndicesMap, SelectionsList } from "./selection"

export function insert(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    position: "before" | "after" | "parallel",
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const partial = produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelections }) => {
            const type = position === "parallel" ? "parallel" : "sequential"
            for (const { indices, steps } of selectionsList) {
                const paths =
                    position === "after" ? [getSelectedStepsPath(steps)] : getSelectedStepsUpwardsPaths(steps, grammar)
                for (const path of paths) {
                    const joinedPath = path.join(",")
                    const all = indicesMap[joinedPath] ?? []

                    if(all.length > 0 && indices.length === 0) {
                        return
                    }

                    const translatedPath = translatePath<HierarchicalInfo>(draft, path)
                    if (translatedPath == null) {
                        continue
                    }

                    const newSteps = stepGenerator(path)
                    const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
                    const translatedSteps = translateSelectionsForStep(
                        all,
                        indices,
                        position === "parallel" ? "before" : position,
                        newSteps,
                        oldSteps
                    )

                    const current = getAtPath(translatedPath, path.length - 1)
                    setAtPath(path, translatedPath, path.length - 1, {
                        type,
                        children: position === "before" ? [translatedSteps, current] : [current, translatedSteps],
                    })

                    const resultSteps = newSteps as HierarchicalParsedSteps

                    newSelections.push({
                        steps: resultSteps,
                        indices: [],
                    })
                }
            }
        }
    )
    return {
        ...partial,
        indicesMap: {},
        hovered: undefined,
        dependencyMap: computeDependencies(partial.grammar),
    }
}
