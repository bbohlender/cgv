import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { FullIndex } from "./selection"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

//TODO: negation (to minimize code)

export type SelectionPattern<T, A> = {
    getValueKey: (value: Value<T, A>) => string
    getConditionStep: (value: Value<T, A>) => ParsedSteps
}

const idSelectionPattern: SelectionPattern<any, any> = {
    getValueKey: (value) => value.index.join(","),
    getConditionStep: (value) => ({
        type: "equal",
        children: [
            { type: "operation", identifier: "id", children: [] },
            {
                type: "raw",
                value: value.index.join(","),
            },
        ],
    }),
}

export function translateSelectionsForStep(
    selectedValues: Array<Value<T, A>>,
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
        return toAndUnequalCondition(0, selectedIndices, allIndices, type) ?? { type: "raw", value: false }
    }

    return toOrEqualCondition(selectedIndices, type)
}

function toAndUnequalCondition(
    allIndicesIndex: number,
    selectedIndices: Array<FullIndex>,
    allIndices: Array<FullIndex>,
    type: "before" | "after"
): ParsedSteps | undefined {
    if (allIndicesIndex >= allIndices.length) {
        return undefined
    }
    const restCondition = toAndUnequalCondition(allIndicesIndex + 1, selectedIndices, allIndices, type)
    const index = allIndices[allIndicesIndex][type]
    const firstCondition: ParsedSteps | undefined =
        selectedIndices.find((selectedIndex) => selectedIndex[type] === index) == null
            ? {
                  type: "unequal",
                  children: [
                      { type: "operation", children: [], identifier: "id" },
                      { type: "raw", value: index },
                  ],
              }
            : undefined

    if (firstCondition != null && restCondition != null) {
        return {
            type: "and",
            children: [firstCondition, restCondition],
        }
    }

    return firstCondition ?? restCondition
}

function toOrEqualCondition(indices: Array<string>, type: "after" | "before"): ParsedSteps {
    if (indices.length === 0) {
        return { type: "raw", value: false }
    }
    const firstCondition: ParsedSteps = {
        type: "equal",
        children: [
            { type: "operation", children: [], identifier: "id" },
            { type: "raw", value: indices[0][type] },
        ],
    }
    if (indices.length === 1) {
        return firstCondition
    }
    return {
        type: "or",
        children: [firstCondition, toOrEqualCondition(indices.slice(1), type)],
    }
}
