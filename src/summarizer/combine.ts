import { Horizontal, summarizeLinearization, Vertical } from "."
import { ParsedSteps } from "../parser"
import { filterNull } from "../util"
import { combineLinearizationResult, LinearizationResult, LinearizedStep } from "./linearize"

export function isCombineable(s1: LinearizedStep, s2: LinearizedStep): boolean {
    if (s1.type !== s2.type) {
        return false
    }
    switch (s1.type) {
        case "filterStart":
            return typeof s1.values[0] === typeof (s2 as typeof s1).values[0]
        case "setVariable":
        case "operation":
        case "getVariable":
        case "nounStart":
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
        case "filterStart":
        case "filterEnd":
        case "nounStart":
        case "nounEnd":
            throw new Error(`unable to combine "${firstStep.type}" here (should be done earlier)`)
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

function summarizeChildren(
    childrenList: Vertical<Horizontal<LinearizationResult>>,
    probabilities: Array<number>
): Array<ParsedSteps> {
    const length = Math.max(...childrenList.map((a) => a.length))
    return new Array(length).fill(undefined).map<ParsedSteps>((_, x) =>
        summarizeLinearization(
            childrenList
                .map<LinearizationResult | undefined>((children, y) => {
                    const child: LinearizationResult | undefined = children[x]
                    const probability = probabilities[y]
                    if (child == null) {
                        return undefined
                    }
                    return applyProbability(child, probability)
                })
                .filter(filterNull)
                .reduce((prev, current) => combineLinearizationResult(prev, current, true))
        )
    )
}

function applyProbability(result: LinearizationResult, probability: number): LinearizationResult {
    return {
        seperationMatrix: result.seperationMatrix,
        vertical: result.vertical.map((row) => ({
            horizontal: row.horizontal,
            probability: row.probability * probability,
        })),
    }
}
