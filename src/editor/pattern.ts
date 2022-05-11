import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { filterNull } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

//TODO: negation (to description size)

export type ConditionSelector = (conditionSteps: Array<ParsedSteps> | undefined) => Promise<ParsedSteps | undefined>

export type SelectionPattern<T, A> = {
    getConditionKey: (value: Value<T, A>) => string
    getConditionStep: (value: Value<T, A>) => ParsedSteps
}

export const idSelectionPattern: SelectionPattern<any, any> = {
    getConditionKey: (value) => value.index.join(","),
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

/**
 * @returns undefined if all should be selected
 */
export async function getSelectionCondition<T, A>(
    allValues: Array<Value<T, A>>,
    selectedValues: Array<Value<T, A>>,
    patterns: Array<SelectionPattern<T, A>>,
    selectCondition: ConditionSelector
): Promise<ParsedSteps | undefined> {
    if (selectedValues.length === allValues.length) {
        return undefined
    }

    const conditions = patterns.map((pattern) => toCondition(selectedValues, allValues, pattern)).filter(filterNull)

    return await selectCondition(conditions)
}

/**
 *
 * @returns undefined if it is not possible to match the selected values with the pattern
 */
function toCondition<T, A>(
    selectedValues: Array<Value<T, A>>,
    allValues: Array<Value<T, A>>,
    pattern: SelectionPattern<T, A>
): ParsedSteps | undefined {
    const keyMap = new Map<string, Value<T, A>>()
    for (const selectedValue of selectedValues) {
        const key = pattern.getConditionKey(selectedValue)
        if (!keyMap.has(key)) {
            keyMap.set(key, selectedValue)
        }
    }

    for (const value of allValues) {
        if (!selectedValues.includes(value) && keyMap.has(pattern.getConditionKey(value))) {
            //the unselected-set overlaps with the selected-set on some condition
            return undefined
        }
    }

    if (keyMap.size === 0) {
        return undefined
    }

    const subConditions = Array.from(keyMap.values()).map((value) => pattern.getConditionStep(value))

    return subConditions.reduce((prev, current) => ({ type: "or", children: [prev, current] }))
}
