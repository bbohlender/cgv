import { Horizontal, summarizeSteps, Vertical } from "."
import { ParsedSteps } from "../parser"
import { Row } from "./group"
import { LinearizedStep } from "./linearize"

export function isCombineable(s1: LinearizedStep, s2: LinearizedStep): boolean {
    if (s1.type !== s2.type) {
        return false
    }
    switch (s1.type) {
        case "filter":
            return typeof s1.values[0] === typeof (s2 as typeof s1).values[0]
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

export function combine(vertical: Vertical<{ value: LinearizedStep; probability: number }>): ParsedSteps {
    if (vertical.length === 0) {
        return { type: "this" }
    }
    const firstStep = vertical[0].value
    switch (firstStep.type) {
        case "filter":
            throw new Error("unable to combine filter directly (use splitFilter) before")
        case "this":
        case "null":
        case "raw":
        case "getVariable":
            return firstStep
        default:
            return {
                ...firstStep,
                children:
                    firstStep.children == null
                        ? undefined
                        : summarizeChildren(
                              vertical.map(({ value }) => (value as typeof firstStep).children),
                              vertical.map(({ probability }) => probability)
                          ),
            } as ParsedSteps
    }
}

function summarizeChildren(childrenList: Array<Array<ParsedSteps>>, probabilities: Array<number>): Array<ParsedSteps> {
    const length = Math.max(...childrenList.map((a) => a.length))
    return new Array(length).fill(undefined).map<ParsedSteps>((_, i) => {
        const iThChildrens = childrenList.map((children) => children[i] ?? { type: "null" })
        return summarizeSteps(iThChildrens, probabilities)
    })
}
