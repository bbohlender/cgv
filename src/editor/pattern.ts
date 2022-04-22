import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { FullIndex } from "./selection"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

export function translateSelectionsForStep(
    allIndices: Array<FullIndex>,
    selectedIndices: Array<FullIndex>,
    type: "before" | "after",
    newSteps: ParsedSteps,
    oldSteps: ParsedSteps
): ParsedSteps {
    if (selectedIndices.length === allIndices.length) {
        return newSteps
    }

    //TODO: group indices is type === "before" (might be not unique)

    return {
        type: "if",
        children: [toCondition(selectedIndices, allIndices, type), newSteps, oldSteps],
    }
}

function toCondition(
    selectedIndices: Array<FullIndex>,
    allIndices: Array<FullIndex>,
    type: "before" | "after"
): ParsedSteps {
    //TODO: detect more advanced patterns and use different condition

    if (selectedIndices.length > allIndices.length * 0.5) {
        return toAndUnequalCondition(selectedIndices, allIndices, type) ?? { type: "raw", value: false }
    }

    return toOrEqualCondition(selectedIndices, type)
}

function toAndUnequalCondition(
    selectedIndices: Array<FullIndex>,
    allIndices: Array<FullIndex>,
    type: "before" | "after"
): ParsedSteps | undefined {
    if (selectedIndices.length === 0) {
        return undefined
    }
    const restCondition = toAndUnequalCondition(selectedIndices.slice(1), allIndices, type)
    const firstCondition: ParsedSteps | undefined =
        allIndices.find((existingIndex) => existingIndex[type] === selectedIndices[0][type]) != null
            ? undefined
            : {
                  type: "unequal",
                  children: [
                      { type: "operation", children: [], identifier: "id" },
                      { type: "raw", value: selectedIndices[0][type] },
                  ],
              }

    if (restCondition == null) {
        return firstCondition
    }

    if (firstCondition == null) {
        return restCondition
    }

    return {
        type: "and",
        children: [firstCondition, restCondition],
    }
}

function toOrEqualCondition(index: Array<FullIndex>, type: "after" | "before"): ParsedSteps {
    if (index.length === 0) {
        return { type: "raw", value: false }
    }
    const firstCondition: ParsedSteps = {
        type: "equal",
        children: [
            { type: "operation", children: [], identifier: "id" },
            { type: "raw", value: index[0][type] },
        ],
    }
    if (index.length === 1) {
        return firstCondition
    }
    return {
        type: "or",
        children: [firstCondition, toOrEqualCondition(index.slice(1), type)],
    }
}
