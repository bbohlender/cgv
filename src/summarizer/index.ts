import {
    equalizeSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
    removeInitialBrackets,
    replaceSymbolsGrammar,
    trimSteps,
} from ".."
import { ParsedRandom } from "../parser"

export function summarize(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar).map(([, steps]) => trimSteps(steps))
    const equalizedSteps = equalizeSteps(steps)
    const combinedSteps = combineSteps(equalizedSteps, combineRandomAndReplace, unifyNestedRandom)
    return { s1: combinedSteps }
}

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
export function combineRandomAndReplace(steps1: ParsedStepsSummary, steps2: ParsedStepsSummary): void {
    const summarySize = steps1.summarySize + steps2.summarySize
    const element: ParsedRandom = {
        type: "random",
        probabilities: [steps1.summarySize / summarySize, steps2.summarySize / summarySize],
        children: [],
    }
    const parent1 = steps1.parent
    const parent2 = steps2.parent
    const children = [
        { ...steps1, parent: steps1 },
        { ...steps2, parent: steps2 },
    ]

    steps1.children = children
    steps2.children = children

    steps1.summarySize = summarySize
    steps2.summarySize = summarySize

    steps1.element = element
    steps2.element = element

    steps1.parent = parent1
    steps2.parent = parent2
}

export function unifyNestedRandom(steps: ParsedSteps): ParsedSteps {
    if (steps.type !== "random") {
        return steps
    }
    const map = new Map<ParsedSteps, number>()
    for (let i = 0; i < steps.children.length; i++) {
        const childProbability = steps.probabilities[i]
        const child = removeInitialBrackets(steps.children[i])
        if (child.type === "random") {
            for (let i = 0; i < child.children.length; i++) {
                const childOfChild = child.children[i]
                const probability = child.probabilities[i] * childProbability
                map.set(childOfChild, (map.get(childOfChild) ?? 0) + probability)
            }
        } else {
            map.set(child, (map.get(child) ?? 0) + childProbability)
        }
    }
    return {
        type: "random",
        children: Array.from(map.keys()),
        probabilities: Array.from(map.values()),
    }
}

//TODO: remove this and instead add additional information on the ParsedSteps (yes that means replacing the parent's child entry at the specific index on exchange)
type ParsedStepsSummary = {
    element: ParsedSteps
    children?: Array<ParsedStepsSummary>
    summarySize: number
    parent?: ParsedStepsSummary
}

type StepsMap = Map<ParsedSteps["type"], Set<ParsedStepsSummary>>

/**
 * traverses the ParsedSteps ASTs and try to combine each ParsedSteps with the ParsedSteps of the other ASTs
 * ParsedSteps are combined if they have the same ParsedStep.type and at least one equal child
 * a step is combined unordered (matching children don't need to have the same index) if a ParsedStep is a ParsedParallel step
 */
export function combineSteps(
    stepsList: Array<ParsedSteps>,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void,
    unifyNested: (steps: ParsedSteps) => ParsedSteps
): ParsedSteps {
    let combined = stepsToSummary(stepsList[0])
    for (let i = 1; i < stepsList.length; i++) {
        combined = combineRecursively(combined, stepsToSummary(stepsList[i]), combineAndReplace)
    }
    return summaryToSteps(combined, unifyNested)
}

function summaryToSteps(summary: ParsedStepsSummary, unifyNested: (steps: ParsedSteps) => ParsedSteps): ParsedSteps {
    summary.element.children = summary.children?.map((child) => summaryToSteps(child, unifyNested))
    return unifyNested(summary.element)
}

function stepsToSummary(steps: ParsedSteps, parent?: ParsedStepsSummary): ParsedStepsSummary {
    const element: ParsedStepsSummary = {
        element: steps,
        summarySize: 1,
        children: undefined,
        parent,
    }
    element.children = steps.children?.map((child) => stepsToSummary(child, element))
    return element
}

function indexComplexStepsSummary(steps: ParsedStepsSummary): StepsMap {
    const map: StepsMap = new Map()
    function traverse(steps: ParsedStepsSummary): void {
        if (steps.children == null || steps.children.length === 0) {
            return
        }
        let set = map.get(steps.element.type)
        if (set == null) {
            set = new Set()
            map.set(steps.element.type, set)
        }
        set.add(steps)
        for (const child of steps.children) {
            traverse(child)
        }
    }
    traverse(steps)
    return map
}

function combineRecursively(
    summary1: ParsedStepsSummary,
    summary2: ParsedStepsSummary,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): ParsedStepsSummary {
    const map1 = indexComplexStepsSummary(summary1)
    const map2 = indexComplexStepsSummary(summary2)
    for (const [, set] of map1) {
        for (const entry1 of set) {
            combineWithSet(entry1, map1, map2, combineAndReplace)
        }
    }
    if (summary1.element != summary2.element) {
        combineAndReplace(summary1, summary2)
    }
    return summary1
}

function combineWithSet(
    mainSummary: ParsedStepsSummary,
    mainMap: StepsMap,
    foreignMap: StepsMap,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): void {
    const foreignEntries = foreignMap.get(mainSummary.element.type)
    if (foreignEntries != null) {
        for (const foreignEntry of foreignEntries) {
            if (
                foreignEntry.element === mainSummary.element ||
                !stepsMatchable(foreignEntry.element, mainSummary.element)
            ) {
                continue
            }

            combineTwoSteps(mainSummary, foreignEntry, combineAndReplace)

            if (mainSummary.parent != null) {
                combineWithSet(mainSummary.parent, mainMap, foreignMap, combineAndReplace)
            }
            if (foreignEntry.parent != null) {
                combineWithSet(foreignEntry.parent, foreignMap, mainMap, combineAndReplace)
            }
        }
    }
}

function combineTwoSteps(
    parent1: ParsedStepsSummary,
    parent2: ParsedStepsSummary,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): void {
    let equal: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary, i1: number, i2: number) => boolean
    let ordered: (steps: ParsedStepsSummary, index: number) => boolean
    switch (parent1.element.type) {
        case "parallel":
            //TODO: matchMatching and return empty when no matching found
            ordered = () => false
            equal = (s1, s2) => s1.element === s2.element
            break
        case "add":
        case "multiply":
        case "and":
        case "or":
        case "equal":
        case "unequal":
        case "random":
            ordered = () => false
            equal = (s1, s2) => s1.element === s2.element
            break
        case "switch":
            ordered = (_, i) => i === 0
            equal = (s1, s2, i1, i2) =>
                s1.element === s2.element &&
                ((i1 === 0 && i2 === 0) ||
                    (parent1.element as any).cases[i1 - 1] === (parent2.element as any).cases[i2 - 1])
            break
        default:
            ordered = () => true
            equal = (s1, s2) => s1.element === s2.element
    }

    let matchings: Array<
        [ParsedStepsSummary | undefined, number | undefined, ParsedStepsSummary | undefined, number | undefined]
    > = []
    const unmatchedIndices = new Set(Object.keys(parent2.children!).map(Number.parseInt))

    let matchCount = 0
    for (let i = 0; i < parent1.children!.length; i++) {
        const child = parent1.children![i]
        const matchIndex = findMatchIndex(child, i, parent2, ordered, equal)
        const match = matchIndex != null ? parent2.children![matchIndex] : undefined
        if (matchIndex != null) {
            matchCount++
            unmatchedIndices.delete(matchIndex)
        }
        matchings.push([child, i, match, matchIndex])
    }
    for (const unmatchedIndex of unmatchedIndices) {
        matchings.push([undefined, undefined, parent2.children![unmatchedIndex], unmatchedIndex])
    }

    if (matchCount === 0) {
        //not matchable
        return
    }

    const parentLength = Math.max(parent1.children!.length, parent2.children!.length)

    if (matchCount >= parentLength / 2) {
        if (matchCount !== parentLength) {
            for (const [entry1, index1, entry2, index2] of matchings) {
                if (entry1 != null && entry2 != null) {
                    combineAndReplace(entry1, entry2)
                }

                switch (parent1.element.type) {
                    case "switch":
                        const cases1 = parent1.element.cases
                        const cases2 = (parent2.element as any).cases
                        const caseValue = index1 != null ? cases1[index1] : index2 != null ? cases2[index2] : undefined

                        if (index1 == null) {
                            cases1.push(caseValue)
                        }

                        if (index2 == null) {
                            cases2.push(caseValue)
                        }
                        break
                    case "random":
                        const probabilities1 = parent1.element.probabilities
                        const probabilities2 = (parent2.element as any).probabilities

                        const probability1 = index1 == null ? 0 : probabilities1[index1]
                        const probability2 = index2 == null ? 0 : probabilities2[index2]
                        const probability = (probability1 + probability2) / 2

                        if (index1 != null) {
                            probabilities1[index1] = probability
                        } else {
                            probabilities1.push(probability)
                        }

                        if (index2 != null) {
                            probabilities2[index2] = probability
                        } else {
                            probabilities2.push(probability)
                        }
                        break
                    default:
                        continue
                }
                //for switch and random
                if (entry1 != null && entry2 == null) {
                    parent2.children!.push(entry1)
                }
                if (entry2 != null && entry1 == null) {
                    parent1.children!.push(entry2)
                }
            }
        }

        parent2.element = parent1.element
        const summarySize = parent1.summarySize + parent2.summarySize
        parent1.summarySize = summarySize
        parent2.summarySize = summarySize
    } else {
        combineAndReplace(parent1, parent2)
    }
}

function findMatchIndex(
    steps: ParsedStepsSummary,
    index: number,
    parent: ParsedStepsSummary,
    ordered: (steps: ParsedStepsSummary, index: number) => boolean,
    equal: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary, i1: number, i2: number) => boolean
): number | undefined {
    if (ordered(steps, index)) {
        if (index >= parent.children!.length) {
            throw new Error(
                `can't match in order at index ${index} when matching parent has only ${
                    parent.children!.length
                } children`
            )
        }
        const child = parent.children![index]
        return equal(steps, child, index, index) ? index : undefined
    }
    for (let i = 0; i < parent.children!.length; i++) {
        const child = parent.children![i]
        if (equal(steps, child, index, i)) {
            return i
        }
    }
    return undefined
}

/**
 * compares everything except for the children of the steps
 */
function stepsMatchable(element1: ParsedSteps, element2: any) {
    switch (element1.type) {
        case "operation":
        case "getVariable":
        case "setVariable":
        case "symbol":
            return element1.identifier === element2.identifier
        case "raw":
            return element1.value === element2.value
        case "if": //same condition
            return element1.children[0] === element2.children[0]
        case "switch": //same switch value
            return element1.children[0] === element2.children[0]
        default:
            return true
    }
}
