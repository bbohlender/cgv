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
import { HierarchicalParsedSteps } from "../util"
import { IndicesMap, SelectionsList } from "./selection"

export function insert(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    position: "before" | "after" | "parallel",
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with replace) for simplification (e.g. flatten)
    const partial = produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelections }) => {
            const type = position === "parallel" ? "parallel" : "sequential"
            for (const { indices, steps } of selectionsList) {
                const path = steps.path.join(",")
                const all = indicesMap[path] ?? []

                const translatedPath = translatePath<HierarchicalInfo>(draft, steps.path)
                if (translatedPath == null) {
                    continue
                }

                const newSteps = stepGenerator(steps.path)
                const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
                const translatedSteps = translateSelectionsForStep(all, indices, newSteps, oldSteps)

                const current = getAtPath(translatedPath, steps.path.length - 1)
                setAtPath(steps.path, translatedPath, steps.path.length - 1, {
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
    )
    return {
        ...partial,
        indicesMap: {},
        hovered: undefined
    }
}
