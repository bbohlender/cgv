import { ConfigAddition, Horizontal, summarizeLinearization, Vertical } from "."
import { AbstractParsedNoun, ParsedSteps } from "../parser"
import { filterNull } from "../util"
import { NestGroupConfig } from "./group"
import { combineLinearizationResult, LinearizationResult, LinearizedStep } from "./linearize"

/**
 * @param vertical sum of all probabilities must be 1
 */
export function combine(
    config: NestGroupConfig<LinearizedStep, ParsedSteps, ConfigAddition>,
    vertical: Vertical<{ value: LinearizedStep; probability: number }>
): ParsedSteps {
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
                              vertical.map(({ probability }) => probability),
                              config.createNoun
                          ),
            } as ParsedSteps
    }
}

function summarizeChildren(
    childrenList: Vertical<Horizontal<LinearizationResult>>,
    probabilities: Array<number>,
    createNoun: (identifier: string) => AbstractParsedNoun<unknown>
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
                .reduce((prev, current) => combineLinearizationResult(prev, current, true)),
            createNoun
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
