import {
    equalizeSteps,
    ParsedGrammarDefinition,
    ParsedSteps,
    replaceSymbolsGrammar,
    splitStepsToGrammar,
    trimSteps,
} from ".."
import { ParsedRandom } from "../parser"

export function summarize(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar).map(([, steps]) => trimSteps(steps))
    const equalizedSteps = equalizeSteps(steps)
    const combinedSteps = combineSteps(equalizedSteps, combineRandomAndReplace)
    return splitStepsToGrammar(combinedSteps)
}

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
export function combineRandomAndReplace(steps1: ParsedStepsSummary, steps2: ParsedStepsSummary): void {
    const summarySize = steps1.summarySize + steps2.summarySize
    const element: Omit<ParsedRandom, "children"> = {
        type: "random",
        probabilities: [steps1.summarySize / summarySize, steps2.summarySize / summarySize],
    }
    const parent1 = steps1.parent
    const parent2 = steps2.parent
    const children = [
        { ...steps1, parent: steps1 },
        { ...steps2, parent: steps2 },
    ]

    steps1.children = children
    steps1.children = children

    steps1.summarySize = summarySize
    steps2.summarySize = summarySize

    steps1.element = element
    steps2.element = element

    steps1.parent = parent1
    steps2.parent = parent2
}

type ParsedStepsSummary = {
    element: Omit<ParsedSteps, "children">
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
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): ParsedSteps {
    let combined = stepsToSummary(stepsList[0])
    for (let i = 1; i < stepsList.length; i++) {
        combined = combineTwoSteps(combined, stepsToSummary(stepsList[i]), combineAndReplace)
    }
    //TODO: unify nested combinations
    return summaryToSteps(combined)
}

function summaryToSteps(summary: ParsedStepsSummary): ParsedSteps {
    return {
        ...summary.element,
        children: summary.children?.map((child) => summaryToSteps(child)),
    } as ParsedSteps
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

function combineTwoSteps(
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
    const entries = foreignMap.get(mainSummary.element.type)
    if (entries != null) {
        for (const foreignEntry of entries) {
            const equalCount = countEqualChilds(mainSummary, foreignEntry)
            if (foreignEntry.element != mainSummary.element && equalCount > 0) {
                combineAndReplace(mainSummary, foreignEntry)
                if (mainSummary.parent != null) {
                    combineWithSet(mainSummary.parent, mainMap, foreignMap, combineAndReplace)
                }
                if (foreignEntry.parent != null) {
                    combineWithSet(foreignEntry.parent, foreignMap, mainMap, combineAndReplace)
                }
            }
        }
    }
}

function countEqualChilds(s1: ParsedStepsSummary, s2: ParsedStepsSummary, unordered = false): number {
    let amount = 0
    if (unordered) {
        //TODO: unordered
    } else {
        if (s1.children!.length != s2.children!.length) {
            throw new Error(`children length can't be unequal if the matching is ordered`)
        }
        for (let i = 0; i < s1.children!.length; i++) {
            if (s1.children![i] == s2.children![i]) {
                amount++
            }
        }
    }
    return amount
}
