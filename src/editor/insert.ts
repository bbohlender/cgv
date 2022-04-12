import produce from "immer"
import { EditorResult, Selections } from "."
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

export function insert(
    position: "before" | "after" | "parallel",
    selections: Selections,
    stepGenerator: (path: HierarchicalPath) => ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    //TODO: generic solution (together with replace) for simplification (e.g. flatten)
    return produce({ grammar, selections: [] as Selections }, ({ grammar: draft, selections: newSelections }) => {
        const type = position === "parallel" ? "parallel" : "sequential"
        for (const selection of selections) {
            const arrayPath = selection.steps.path

            const translatedPath = translatePath<HierarchicalInfo>(draft, arrayPath)
            if (translatedPath == null) {
                continue
            }

            const newSteps = stepGenerator(arrayPath)
            const oldSteps: ParsedSteps = type === "parallel" ? { type: "null" } : { type: "this" }
            const steps = translateSelectionsForStep(selection.indices, newSteps, oldSteps)

            const current = getAtPath(translatedPath, arrayPath.length - 1)
            setAtPath(arrayPath, translatedPath, arrayPath.length - 1, {
                type,
                children: position === "before" ? [steps, current] : [current, steps],
            })

            newSelections.push({
                steps: newSteps as HierarchicalParsedSteps,
                indices: undefined,
            })
        }
    })
}
