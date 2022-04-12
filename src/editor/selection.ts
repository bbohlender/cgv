import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { HierarchicalParsedSteps } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

export type Selections = Array<Selection>
/**
 * index = undefined - means everything is selected
 */
export type Selection = { steps: HierarchicalParsedSteps; indices: Array<Array<number>> | undefined }

export function translateSelectionsForStep(
    indices: Array<Array<number>> | undefined,
    newSteps: ParsedSteps,
    oldSteps: ParsedSteps
): ParsedSteps {
    if (indices == null) {
        return newSteps
    }

    //TODO: detect more advanced patterns and use different condition
    return {
        type: "if",
        children: [toOrEqualCondition(indices), newSteps, oldSteps],
    }
}

function toOrEqualCondition(index: Array<Array<number>>): ParsedSteps {
    if (index.length === 0) {
        return { type: "raw", value: false }
    }
    const firstCondition: ParsedSteps = {
        type: "equal",
        children: [
            { type: "operation", children: [], identifier: "id" },
            { type: "raw", value: index[0].join(",") },
        ],
    }
    if (index.length === 1) {
        return firstCondition
    }
    return {
        type: "or",
        children: [firstCondition, toOrEqualCondition(index.slice(1))],
    }
}
