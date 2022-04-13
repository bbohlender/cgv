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
import { IndicesMap } from "./indices"

export function insert(
    position: "before" | "after" | "parallel",
    indicesMap: IndicesMap,
    selectionsMap: IndicesMap,
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with replace) for simplification (e.g. flatten)
    return produce({ grammar, selectionsMap: {} as IndicesMap }, ({ grammar: draft, selectionsMap: newSelections }) => {
        const type = position === "parallel" ? "parallel" : "sequential"
        for (const [id, selectedIndices] of Object.entries(selectionsMap)) {
            const allIndices = indicesMap[id]
            if(selectedIndices == null || allIndices == null) {
                continue
            }
            const arrayPath = id.split(",").map((val, i) => (i === 0 ? val : parseInt(val))) as HierarchicalPath

            const translatedPath = translatePath<HierarchicalInfo>(draft, arrayPath)
            if (translatedPath == null) {
                continue
            }

            const newSteps = stepGenerator(arrayPath)
            const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
            const steps = translateSelectionsForStep(allIndices, selectedIndices, newSteps, oldSteps)

            const current = getAtPath(translatedPath, arrayPath.length - 1)
            setAtPath(arrayPath, translatedPath, arrayPath.length - 1, {
                type,
                children: position === "before" ? [steps, current] : [current, steps],
            })

            newSelections[id] = []
        }
    })
}
