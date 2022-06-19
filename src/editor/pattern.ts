import { Value } from "../interpreter"
import { ParsedSteps } from "../parser"
import { filterNull } from "../util"

export type InterpretedInfo = {
    values?: Array<Value<any, any>>
}

//TODO: negation (to decrease description size)

export type PatternSelector = (patterns: Array<Pattern<any, any>>) => Promise<Pattern<any, any>>

export type Pattern<T, A> = {
    description: string
    isSelected: (value: Value<T, A>) => boolean
    generateStep: (() => ParsedSteps) | undefined
}

type SizedPattern<T, A> = Pattern<T, A> & {
    keySize: number
    selectionSize: number
}

export type PatternType<T, A> = {
    generateMatching: (allValues: Array<Value<T, A>>, selectedValues: Array<Value<T, A>>) => Pattern<T, A> | undefined
    generateContaining: (allValues: Array<Value<T, A>>, selectedValues: Array<Value<T, A>>) => Pattern<T, A> | undefined
}

const getValueIndex = (value: Value<any, any>) => value.index[value.index.length - 1]

const getValueIndexModuloKey = (value: Value<any, any>, modulo: number): number => getValueIndex(value) % modulo

const getValueIndexModuloCondition = (value: Value<any, any>, modulo: number): ParsedSteps => ({
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
    allValues: Array<Value<any, any>>,
    selectedValues: Array<Value<any, any>>,
    modulo: number,
    checkSelection?: (newSelectedValues: Array<Value<any, any>>) => boolean
) {
    return computePattern(
        (keys) => (keys == null ? `all indices` : `index % ${modulo} is in ${keys.join(", ")}`),
        allValues,
        selectedValues,
        (value) => getValueIndexModuloKey(value, modulo),
        (value) => getValueIndexModuloCondition(value, modulo),
        checkSelection
    )
}

function getDistinctSortedIndices(selectedValues: Array<Value<any, any>>) {
    return selectedValues
        .map(getValueIndex)
        .filter((value, index, self) => self.indexOf(value) === index) //distinct
        .sort((v1, v2) => v1 - v2)
}

export const generateAllPattern = (description = "all"): Pattern<any, any> => ({
    description,
    isSelected: () => true,
    generateStep: undefined,
})

export const allPatternType: PatternType<any, any> = {
    generateContaining: generateAllPattern.bind(null, undefined),
    generateMatching: generateAllPattern.bind(null, undefined),
}

function selectBestPattern(
    isBetter: (p1: SizedPattern<any, any>, p2: SizedPattern<any, any>) => boolean,
    ...p: Array<SizedPattern<any, any> | undefined>
): Pattern<any, any> | undefined {
    const patterns = p.filter(filterNull)

    let bestPattern: SizedPattern<any, any> | undefined

    for (const pattern of patterns) {
        if (bestPattern == null || isBetter(pattern, bestPattern)) {
            bestPattern = pattern
        }
    }

    return bestPattern
}

export const indexModuloPatternType: PatternType<any, any> = {
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

const getValueIdKey = (value: Value<any, any>) => value.index.join(",")

export const indexPatternType: PatternType<any, any> = {
    generateMatching: (allValues, selectedValues) =>
        computePattern(
            (keys) => (keys == null ? "all indices" : `index is in ${keys.join(", ")}`),
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
            (keys) => (keys == null ? "all indices" : `index is in ${keys.join(", ")}`),
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
): Pattern<any, any> {
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

const computeIndexGreaterEqual = computeIndexComparisonPattern.bind(
    null,
    (comparator: number, index: number) => index >= comparator,
    (comparator: number) => `index >= ${comparator}`,
    "greaterEqual"
)
const computeIndexSmallerEqual = computeIndexComparisonPattern.bind(
    null,
    (comparator: number, index: number) => index <= comparator,
    (comparator: number) => `index <= ${comparator}`,
    "smallerEqual"
)

export const indexSmallerEqualPatternType: PatternType<any, any> = {
    generateMatching: (allValues, selectedValues) => {
        const max = Math.max(...selectedValues.map(getValueIndex))
        const newSelectedValues = allValues.filter((value) => getValueIndex(value) <= max)
        if (newSelectedValues.length === allValues.length) {
            return generateAllPattern(`all (index <= ${max})`)
        }
        if (!patternIsMatching(allValues, selectedValues, newSelectedValues)) {
            return undefined
        }
        return computeIndexSmallerEqual(max)
    },
    generateContaining: (allValues, selectedValues) => {
        const max = Math.max(...selectedValues.map(getValueIndex))
        return computeIndexSmallerEqual(max)
    },
}

export const indexGreaterEqualPatternType: PatternType<any, any> = {
    generateMatching: (allValues, selectedValues) => {
        const min = Math.min(...selectedValues.map(getValueIndex))
        const newSelectedValues = allValues.filter((value) => getValueIndex(value) >= min)
        if (newSelectedValues.length === allValues.length) {
            return generateAllPattern(`all (index >= ${min})`)
        }
        if (!patternIsMatching(allValues, selectedValues, newSelectedValues)) {
            return undefined
        }
        return computeIndexGreaterEqual(min)
    },
    generateContaining: (allValues, selectedValues) => {
        const min = Math.min(...selectedValues.map(getValueIndex))
        return computeIndexGreaterEqual(min)
    },
}

export const idPatternType: PatternType<any, any> = {
    generateMatching: (allValues, selectedValues) =>
        computePattern(
            (keys) => (keys == null ? "all ids" : `id is in ${keys.join(", ")}`),
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

function allPatternsMatchAll(patterns: Array<Pattern<any, any>>): boolean {
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
export async function getMatchingCondition<T, A>(
    allValues: Array<Value<T, A>>,
    selectedValues: Array<Value<T, A>>,
    patternTypes: Array<PatternType<T, A>>,
    selectPattern: PatternSelector
): Promise<Pattern<T, A>> {
    if (selectedValues.length === allValues.length) {
        return generateAllPattern()
    }

    const patterns = patternTypes
        .map((pattern) => pattern.generateMatching(allValues, selectedValues))
        .filter(filterNull)

    if (patterns.length === 0) {
        throw new Error(`no pattern found (missing the allPatternType?)`)
    }

    if (allPatternsMatchAll(patterns)) {
        return generateAllPattern()
    }

    return selectPattern(patterns)
}

/**
 * @returns undefined if all should be selected
 */
export async function getContainingCondition<T, A>(
    allValues: Array<Value<T, A>>,
    selectedValues: Array<Value<T, A>>,
    patternTypes: Array<PatternType<T, A>>,
    selectPattern: PatternSelector
): Promise<Pattern<T, A>> {
    if (selectedValues.length === allValues.length) {
        return generateAllPattern()
    }

    const patterns = patternTypes
        .map((pattern) => pattern.generateContaining(allValues, selectedValues))
        .filter(filterNull)

    if (patterns.length === 0) {
        throw new Error(`no pattern found (missing the allPatternType?)`)
    }

    return selectPattern(patterns)
}

export function patternIsMatching<T, A>(
    allValues: Array<Value<T, A>>,
    selectedValues: Array<Value<T, A>>,
    newSelection: Array<Value<T, A>>
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
 * @returns undefined if it is not possible to match the selected values with the pattern
 */
export function computePattern<T, A>(
    getDescription: (keys: Array<string | number> | undefined) => string,
    allValues: Array<Value<T, A>>,
    selectedValues: Array<Value<T, A>>,
    getValueKey: (value: Value<T, A>) => string | number,
    getValueCondition: (value: Value<T, A>) => ParsedSteps,
    checkSelection?: (newSelectedValues: Array<Value<T, A>>) => boolean
): SizedPattern<T, A> | undefined {
    const keyMap = new Map<string | number, Value<T, A>>()
    for (const selectedValue of selectedValues) {
        const key = getValueKey(selectedValue)
        if (!keyMap.has(key)) {
            keyMap.set(key, selectedValue)
        }
    }

    const keys = Array.from(keyMap.keys())

    const newSelectedValues = allValues.filter((value) => keys.includes(getValueKey(value)))

    if (newSelectedValues.length === allValues.length) {
        return {
            description: getDescription(undefined),
            generateStep: undefined,
            isSelected: () => true,
            keySize: 0,
            selectionSize: newSelectedValues.length,
        }
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
