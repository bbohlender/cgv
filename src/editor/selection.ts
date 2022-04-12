import produce from "immer"
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
export type Selection = {
    steps: HierarchicalParsedSteps
    selectedIndices?: Array<Array<number>>
    allIndices?: Array<Array<number>>
}

export function translateSelectionsForStep(
    selectedIndices: Array<Array<number>> | undefined,
    allIndices: Array<Array<number>> | undefined,
    newSteps: ParsedSteps,
    oldSteps: ParsedSteps
): ParsedSteps {
    if (selectedIndices == null || allIndices == null) {
        return newSteps
    }

    return {
        type: "if",
        children: [toCondition(selectedIndices, allIndices), newSteps, oldSteps],
    }
}

function toCondition(selectedIndices: Array<Array<number>>, allIndices: Array<Array<number>>): ParsedSteps {
    //TODO: detect more advanced patterns and use different condition

    if (selectedIndices.length > allIndices.length * 0.5) {
        const allJoinedIndices: Array<string> = allIndices.map((index) => index.join(","))
        return toAndUnequalCondition(selectedIndices, allJoinedIndices) ?? { type: "raw", value: false }
    }

    return toOrEqualCondition(selectedIndices)
}

function toAndUnequalCondition(
    selectedIndices: Array<Array<number>>,
    allIndices: Array<string>
): ParsedSteps | undefined {
    const restCondition = toAndUnequalCondition(selectedIndices.slice(1), allIndices)
    const key = selectedIndices.join(",")
    const firstCondition: ParsedSteps | undefined = allIndices.includes(key)
        ? undefined
        : {
              type: "unequal",
              children: [
                  { type: "operation", children: [], identifier: "id" },
                  { type: "raw", value: selectedIndices[0].join(",") },
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

//must return a new array
export function setSelection(
    steps: HierarchicalParsedSteps,
    index: Array<number> | undefined,
    allIndices: Array<Array<number>> | undefined
): Selections {
    if (allIndices == null || index == null) {
        return [{ steps }]
    }
    if (index.length === allIndices.length) {
        return [{ steps }]
    }
    return [
        {
            steps,
            allIndices,
            selectedIndices: [index],
        },
    ]
}

export function toggleSelection(
    selections: Selections,
    steps: HierarchicalParsedSteps,
    index: Array<number> | undefined,
    allIndices: Array<Array<number>> | undefined
): Selections {
    const selectionIndex = selections.findIndex((selection) => selection.steps === steps)
    return produce(selections, (draft) => {
        if (index == null || allIndices == null) {
            if (selectionIndex === -1) {
                draft.push({ steps })
            } else {
                draft.splice(selectionIndex, 1)
            }
            return
        }

        if (selectionIndex === -1) {
            draft.push({
                steps,
                allIndices,
                selectedIndices: [index],
            })
            return
        }

        const selection = draft[selectionIndex]

        if (selection.allIndices == null || selection.selectedIndices == null) {
            selection.allIndices = allIndices
            selection.selectedIndices = allIndices
        }

        const indexKey = index.join(",")

        const indexIndex = selection.selectedIndices.findIndex((i) => i.join(",") === indexKey)

        if (indexIndex === -1) {
            selection.selectedIndices.push(index)
        } else {
            selection.selectedIndices.splice(indexIndex, 1)
        }
    })
}
