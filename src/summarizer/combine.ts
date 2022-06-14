import { Horizontal, Vertical } from "."
import { ParsedSteps } from "../parser"
import { LinearizedStep } from "./linearize"

export function isCombineable(s1: LinearizedStep, s2: LinearizedStep): boolean {
    if (s1.type !== s2.type) {
        return false
    }
    switch (s1.type) {
        case "filter-conditional":
            return typeof s1.value === typeof (s2 as typeof s1).value
        case "setVariable":
        case "operation":
        case "getVariable":
            return s1.identifier === (s2 as typeof s1).identifier
        case "raw":
            return s1.value === (s2 as typeof s1).value
        default:
            return true
    }
}

export function combine(values: Vertical<Horizontal<LinearizedStep>>): ParsedSteps {
    throw new Error("not implemented")
    /*if (values.length === 0 || values[0].length === 0) {
        return { type: "this" }
    }
    const firstStep = values[0][0]
    switch (firstStep.type) {
        case "filter-conditional": {
            const conditions: Array<ParsedSteps> = []
            const valueMap = new Map<any, Array<Horizontal<LinearizedStep>>>()
            for (let y = 0; y < values.length; y++) {
                const value = (values[y][0] as typeof firstStep).value
                let entry = valueMap.get(value)
                if (entry == null) {
                    entry = []
                    valueMap.set(value, entry)
                }
                entry.push(values[y].slice(1))
            }
            if (typeof firstStep.value === "boolean") {
                return {
                    type: "if",
                    children: [
                        { type: "random", children: conditions, probabilities },
                        combine(valueMap.get(true) ?? []),
                        combine(valueMap.get(false) ?? []),
                    ],
                }
            } else {
                return {
                    type: "switch",
                    children: [
                        { type: "random", children: conditions, probabilities },
                        ...Array.from(valueMap.values()).map((caseStep) => combine(caseStep)),
                    ],
                    cases: Array.from(valueMap.keys()),
                }
            }
        }
        case "filter-random":
            return //TBD
        case "this":
        case "null":
        case "raw":
        case "getVariable":
            return firstStep
        default:
            return {
                ...firstStep,
                children: [],
            } as ParsedSteps
    }*/
}
