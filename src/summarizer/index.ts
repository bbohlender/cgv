import {
    equalizeSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
    removeInitialBrackets,
    replaceSymbolsGrammar,
    trimSteps,
} from ".."
import { ParsedRandom, ParsedSwitch } from "../parser"

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
    let isPotentialMatch: (index1: number, index2: number) => boolean

    switch (parent1.element.type) {
        case "parallel":
            isPotentialMatch = () => true
            break
        case "random":
            isPotentialMatch = () => true
            break
        case "switch":
            const cases1 = parent1.element.cases
            const cases2 = (parent2.element as ParsedSwitch).cases
            isPotentialMatch = (index1, index2) => cases1[index1 - 1] === cases2[index2 - 1]
            break
        case "add":
        case "multiply":
        case "and":
        case "or":
        case "equal":
        case "unequal":
            isPotentialMatch = () => true
            break
        default:
            //ordered match
            isPotentialMatch = (index1, index2) => index1 === index2
    }

    const childSet1 = new Map<ParsedStepsSummary, number>(parent1.children!.map((child, index) => [child, index]))
    const childSet2 = new Map<ParsedStepsSummary, number>(parent2.children!.map((child, index) => [child, index]))

    let equalMatchesCount = 0

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(i1, i2) && child1.element === child2.element) {
                childSet1.delete(child1)
                childSet2.delete(child2)
                ++equalMatchesCount
                break
            }
        }
    }

    if (equalMatchesCount === 0) {
        return
    }

    if (equalMatchesCount < Math.max(parent1.children!.length, parent2.children!.length) / 2) {
        combineAndReplace(parent1, parent2)
        return
    }

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(i1, i2) && child1.element !== child2.element) {
                childSet1.delete(child1)
                childSet2.delete(child2)
                combineAndReplace(child1, child2)
                break
            }
        }
    }

    const emptyMatches = [
        ...Array.from(childSet1).map<[ParsedStepsSummary, number, undefined, undefined]>(([child, index]) => [
            child,
            index,
            undefined,
            undefined,
        ]),
        ...Array.from(childSet2).map<[undefined, undefined, ParsedStepsSummary, number]>(([child, index]) => [
            undefined,
            undefined,
            child,
            index,
        ]),
    ]

    for (const [step1, index1, step2, index2] of emptyMatches) {
        switch (parent1.element.type) {
            case "random":
                if (step1 != null && index1 != null) {
                    addRandomChild(step1, index1, parent2)
                }
                if (step2 != null && index2 != null) {
                    addRandomChild(step2, index2, parent1)
                }
                break
            default:
                throw new Error(`step of type "${parent1.element.type}" can't have empty matches`)
        }
    }

    parent2.element = parent1.element
    const summarySize = parent1.summarySize + parent2.summarySize
    parent1.summarySize = summarySize
    parent2.summarySize = summarySize
}

function addRandomChild(steps: ParsedStepsSummary, index: number, otherParent: ParsedStepsSummary) {
    const probability = (otherParent.element as ParsedRandom).probabilities[index]
    otherParent.children!.push(steps)
    ;(otherParent.element as ParsedRandom).probabilities.push(probability * 0.5)
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
