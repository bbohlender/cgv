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
import { SelectionsMap } from "./indices"

export function insert(
    position: "before" | "after" | "parallel",
    selectionsMap: SelectionsMap,
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    //TODO: generic solution (together with replace) for simplification (e.g. flatten)
    return produce(
        { grammar, selectionsMap: {} as SelectionsMap },
        ({ grammar: draft, selectionsMap: newSelections }) => {
            const type = position === "parallel" ? "parallel" : "sequential"
            for (const [id, selections] of Object.entries(selectionsMap)) {
                if (selections == null || selections.selected == null) {
                    continue
                }
                const arrayPath = id.split(",").map((val, i) => (i === 0 ? val : parseInt(val))) as HierarchicalPath

                const translatedPath = translatePath<HierarchicalInfo>(draft, arrayPath)
                if (translatedPath == null) {
                    continue
                }

                const newSteps = stepGenerator(arrayPath)
                const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
                const steps = translateSelectionsForStep(selections.all, selections.selected, newSteps, oldSteps)

                const current = getAtPath(translatedPath, arrayPath.length - 1)
                setAtPath(arrayPath, translatedPath, arrayPath.length - 1, {
                    type,
                    children: position === "before" ? [steps, current] : [current, steps],
                })

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
