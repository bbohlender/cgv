import { Value } from "../interpreter"
import { ParsedTransformation } from "../parser"
import { filterNull } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any>>
}

//TODO: negation (to decrease description size)

export type PatternSelector = (patterns: Array<Pattern<any>>) => Promise<Pattern<any>>

export type Pattern<T> = {
    description: string
    isSelected: (value: Value<T>) => boolean
    generateStep: (() => ParsedTransformation) | undefined
}

type SizedPattern<T> = Pattern<T> & {
    keySize: number
    selectionSize: number
}

export type PatternType<T> = {
    generateMatching: (allValues: Array<Value<T>>, selectedValues: Array<Value<T>>) => Pattern<T> | undefined
    generateContaining: (allValues: Array<Value<T>>, selectedValues: Array<Value<T>>) => Pattern<T> | undefined
}

const getValueIndex = (value: Value<any>) => value.index[value.index.length - 1]

const getValueIndexModuloKey = (value: Value<any>, modulo: number): number => getValueIndex(value) % modulo

const getValueIndexModuloCondition = (value: Value<any>, modulo: number): ParsedTransformation => ({
    type: "equal",
    children: [
        {
            type: "modulo",
            children: [
                {
                    type: "operation",
                    children: [],
                    identifier: "index",
                },
                {
                    type: "raw",
                    value: modulo,
                },
            ],
        },
        {
            type: "raw",
            value: getValueIndexModuloKey(value, modulo),
        },
    ],
})

function computeModuloPattern(
    allValues: Array<Value<any>>,
    selectedValues: Array<Value<any>>,
    modulo: number,
    checkSelection?: (newSelectedValues: Array<Value<any>>) => boolean
) {
    return computePattern(
        (keys) => `in every set of ${modulo} select index ${keys.join(", ")}`,
        allValues,
        selectedValues,
        (value) => getValueIndexModuloKey(value, modulo),
        (value) => getValueIndexModuloCondition(value, modulo),
        checkSelection
    )
}

function getDistinctSortedIndices(selectedValues: Array<Value<any>>) {
    return selectedValues
        .map(getValueIndex)
        .filter((value, index, self) => self.indexOf(value) === index) //distinct
        .sort((v1, v2) => v1 - v2)
}

export const generateAllPattern = (): Pattern<any> => ({
    description: "everything",
    isSelected: () => true,
    generateStep: undefined,
})

export const allPatternType: PatternType<any> = {
    generateContaining: generateAllPattern,
    generateMatching: generateAllPattern,
}

function selectBestPattern(
    isBetter: (p1: SizedPattern<any>, p2: SizedPattern<any>) => boolean,
    ...p: Array<SizedPattern<any> | undefined>
): Pattern<any> | undefined {
    const patterns = p.filter(filterNull)

    let bestPattern: SizedPattern<any> | undefined

    for (const pattern of patterns) {
        if (bestPattern == null || isBetter(pattern, bestPattern)) {
            bestPattern = pattern
        }
    }

    return bestPattern
}

export const indexModuloPatternType: PatternType<any> = {
    generateMatching: (allValues, selectedValues) => {
        const sortedIndices = getDistinctSortedIndices(selectedValues)

        const modulo1 = sortedIndices[0] + 1
        const modulo2 = sortedIndices[1] - sortedIndices[0]

        return selectBestPattern(
            (p1, p2) => p1.keySize < p2.keySize,
            computeModuloPattern(allValues, selectedValues, modulo1, (newSelectedValues) =>
                patternIsMatching(allValues, selectedValues, newSelectedValues)
            ),
            sortedIndices.length >= 2
                ? computeModuloPattern(allValues, selectedValues, modulo2, (newSelectedValues) =>
                      patternIsMatching(allValues, selectedValues, newSelectedValues)
                  )
                : undefined
        )
    },
    generateContaining: (allValues, selectedValues) => {
        const sortedIndices = getDistinctSortedIndices(selectedValues)

        const modulo1 = sortedIndices[0] + 1
        const modulo2 = sortedIndices[1] - sortedIndices[0]

        return selectBestPattern(
            (p1, p2) => p1.selectionSize < p2.selectionSize,
            computeModuloPattern(allValues, selectedValues, modulo1),
            sortedIndices.length >= 2 ? computeModuloPattern(allValues, selectedValues, modulo2) : undefined
        )
    },
}

const getValueIdKey = (value: Value<any>) => value.index.join(",")

export const indexPatternType: PatternType<any> = {
    generateMatching: (allValues, selectedValues) =>
        computePattern(
            (keys) => `where index is one of ${keys.join(", ")}`,
            allValues,
            selectedValues,
            getValueIndex,
            (value) => ({
                type: "equal",
                children: [
                    {
                        type: "operation",
                        children: [],
                        identifier: "index",
                    },
                    {
                        type: "raw",
                        value: getValueIndex(value),
                    },
                ],
            }),
            (newSelectedValues) => patternIsMatching(allValues, selectedValues, newSelectedValues)
        ),
    generateContaining: (allValues, selectedValues) =>
        computePattern(
            (keys) => `where index is one of ${keys.join(", ")}`,
            allValues,
            selectedValues,
            getValueIndex,
            (value) => ({
                type: "equal",
                children: [
                    {
                        type: "operation",
                        children: [],
                        identifier: "index",
                    },
                    {
                        type: "raw",
                        value: getValueIndex(value),
                    },
                ],
            })
        ),
}

function computeIndexComparisonPattern(
    compare: (comparator: number, index: number) => boolean,
    getDescription: (comparator: number) => string,
    type: "greaterEqual" | "greater" | "smaller" | "smallerEqual",
    comparator: number
): Pattern<any> {
    return {
        description: getDescription(comparator),
        isSelected: (value) => compare(comparator, getValueIndex(value)),
        generateStep: () => ({
            type,
            children: [
                {
                    type: "operation",
                    children: [],
                    identifier: "index",
                },
                {
                    type: "raw",
                    value: comparator,
                },
            ],
        }),
    }
}

const computeIndexGreater = computeIndexComparisonPattern.bind(
    null,
    (comparator: number, index: number) => index > comparator,
    (comparator: number) => `where index > ${comparator}`,
    "greater"
)
const computeIndexSmaller = computeIndexComparisonPattern.bind(
    null,
    (comparator: number, index: number) => index < comparator,
    (comparator: number) => `where index < ${comparator}`,
    "smaller"
)

export const indexSmallerEqualPatternType: PatternType<any> = {
    generateMatching: (allValues, selectedValues) => {
        const max = Math.max(...selectedValues.map(getValueIndex)) + 1
        const newSelectedValues = allValues.filter((value) => getValueIndex(value) < max)
        if (newSelectedValues.length === allValues.length) {
            return undefined
        }
        if (!patternIsMatching(allValues, selectedValues, newSelectedValues)) {
            return undefined
        }
        return computeIndexSmaller(max)
    },
    generateContaining: (allValues, selectedValues) => {
        const max = Math.max(...selectedValues.map(getValueIndex)) + 1
        return computeIndexSmaller(max)
    },
}

export const indexGreaterEqualPatternType: PatternType<any> = {
    generateMatching: (allValues, selectedValues) => {
        const min = Math.min(...selectedValues.map(getValueIndex)) - 1
        const newSelectedValues = allValues.filter((value) => getValueIndex(value) > min)
        if (newSelectedValues.length === allValues.length) {
            return undefined
        }
        if (!patternIsMatching(allValues, selectedValues, newSelectedValues)) {
            return undefined
        }
        return computeIndexGreater(min)
    },
    generateContaining: (allValues, selectedValues) => {
        const min = Math.min(...selectedValues.map(getValueIndex)) - 1
        return computeIndexGreater(min)
    },
}

export const idPatternType: PatternType<any> = {
    generateMatching: (allValues, selectedValues) =>
        computePattern(
            (keys) => `exactly and only my selection`,
            allValues,
            selectedValues,
            getValueIdKey,
            (value) => ({
                type: "equal",
                children: [
                    {
                        type: "operation",
                        children: [],
                        identifier: "id",
                    },
                    {
                        type: "raw",
                        value: value.index.join(","),
                    },
                ],
            }),
            (newSelectedValues) => patternIsMatching(allValues, selectedValues, newSelectedValues)
        ),
    generateContaining: () => undefined,
}

function allPatternsMatchAll(patterns: Array<Pattern<any>>): boolean {
    for (const pattern of patterns) {
        if (pattern.generateStep != null) {
            return false
        }
    }
    return true
}

/**
 * @returns undefined if all should be selected
 */
export async function getMatchingCondition<T>(
    allValues: Array<Value<T>>,
    selectedValues: Array<Value<T>>,
    patternTypes: Array<PatternType<T>>,
    selectPattern: PatternSelector
): Promise<Pattern<T> | undefined> {
    if (selectedValues.length === allValues.length) {
        return undefined
    }

    const patterns = patternTypes
        .map((pattern) => pattern.generateMatching(allValues, selectedValues))
        .filter(filterNull)

    if (patterns.length === 0) {
        throw new Error(`no pattern found (missing the allPatternType?)`)
    }

    if (allPatternsMatchAll(patterns)) {
        return undefined
    }

    return selectPattern(patterns)
}

/**
 * @returns undefined if all should be selected
 */
export async function getContainingCondition<T>(
    allValues: Array<Value<T>>,
    selectedValues: Array<Value<T>>,
    patternTypes: Array<PatternType<T>>,
    selectPattern: PatternSelector
): Promise<Pattern<T> | undefined> {
    if (selectedValues.length === allValues.length) {
        return undefined
    }

    const patterns = patternTypes
        .map((pattern) => pattern.generateContaining(allValues, selectedValues))
        .filter(filterNull)

    if (patterns.length === 0) {
        throw new Error(`no pattern found (missing the allPatternType?)`)
    }

    return selectPattern(patterns)
}

export function patternIsMatching<T>(
    allValues: Array<Value<T>>,
    selectedValues: Array<Value<T>>,
    newSelection: Array<Value<T>>
): boolean {
    if (newSelection.length !== selectedValues.length) {
        return false
    }
    for (const value of selectedValues) {
        if (!newSelection.includes(value)) {
            return false
        }
    }
    return true
}

/**
 *
 * @returns undefined if it is not possible to match the selected values with the pattern or all values would be selected
 */
export function computePattern<T>(
    getDescription: (keys: Array<string | number>) => string,
    allValues: Array<Value<T>>,
    selectedValues: Array<Value<T>>,
    getValueKey: (value: Value<T>) => string | number,
    getValueCondition: (value: Value<T>) => ParsedTransformation,
    checkSelection?: (newSelectedValues: Array<Value<T>>) => boolean
): SizedPattern<T> | undefined {
    const keyMap = new Map<string | number, Value<T>>()
    for (const selectedValue of selectedValues) {
        const key = getValueKey(selectedValue)
        if (!keyMap.has(key)) {
            keyMap.set(key, selectedValue)
        }
    }

    const keys = Array.from(keyMap.keys())

    const newSelectedValues = allValues.filter((value) => keys.includes(getValueKey(value)))

    if (newSelectedValues.length === allValues.length) {
        return undefined
    }

    if (keyMap.size === 0 || (checkSelection != null && !checkSelection(newSelectedValues))) {
        return undefined
    }

    return {
        description: getDescription(keys),
        isSelected: (value) => keyMap.has(getValueKey(value)),
        generateStep: () => {
            const subConditions = Array.from(keyMap.values()).map((value) => getValueCondition(value))
            return subConditions.reduce((prev, current) => ({ type: "or", children: [prev, current] }))
        },
        keySize: keyMap.size,
        selectionSize: newSelectedValues.length,
    }
}
