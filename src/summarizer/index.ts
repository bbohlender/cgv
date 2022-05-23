import { ParsedGrammarDefinition, ParsedSteps } from "../parser"

export function summarize(...descriptions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    summarizeTwo(d1, w1, d2: w2) //w1, w2 weights for the respective description
    throw new Error("method not implemented")
}

export function unifyNested(steps: ParsedSteps): ParsedSteps {
    throw new Error("method not implemented")
}

//TODO: keep grammar symbol names
/*
export function summarize(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar)
    const combinedSteps = combineSteps(steps, combineRandom)
    return { s1: unifyNestedRandom(combinedSteps) }
}

type SummaryInfo = {
    summarySize: number
    parent?: ParsedStepsSummary
    childrenIndex?: number
}

type ParsedStepsSummary = AbstractParsedSteps<SummaryInfo>

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
/*export function combineRandom(steps1: ParsedStepsSummary, steps2: ParsedStepsSummary): ParsedStepsSummary {
    const summarySize = steps1.summarySize + steps2.summarySize
    return {
        type: "random",
        probabilities: [steps1.summarySize / summarySize, steps2.summarySize / summarySize],
        children: [steps1, steps2],
        summarySize,
    }
}

export function unifyNestedRandom(steps: ParsedSteps): ParsedSteps {
    if (steps.type !== "random") {
        const result = { ...steps }
        result.children = steps.children?.map(unifyNestedRandom)
        return result
    }
    const map = new Map<string, [ParsedSteps, number]>()
    for (let i = 0; i < steps.children!.length; i++) {
        const childProbability = steps.probabilities![i]
        const child = unifyNestedRandom(steps.children![i])
        if (child.type === "random") {
            for (let i = 0; i < child.children!.length; i++) {
                const childOfChild = child.children![i]
                const probability = child.probabilities![i] * childProbability
                const key = serializeStepString(childOfChild)
                const [, currentProbability] = map.get(key) ?? [childOfChild, 0]
                map.set(key, [childOfChild, currentProbability + probability])
            }
        } else {
            const key = serializeStepString(child)
            const [, currentProbability] = map.get(key) ?? [child, 0]
            map.set(key, [child, currentProbability + childProbability])
        }
    }
    const results = Array.from(map.values())
    return {
        type: "random",
        children: results.map(([child]) => child),
        probabilities: results.map(([, probability]) => probability),
    }
}

type StepsMap = Map<ParsedStepsSummary["type"], Set<ParsedStepsSummary>>

/**
 * traverses the ParsedSteps ASTs and try to combine each ParsedSteps with the ParsedSteps of the other ASTs
 * ParsedSteps are combined if they have the same ParsedStep.type and at least one equal child
 * a step is combined unordered (matching children don't need to have the same index) if a ParsedStep is a ParsedParallel step
 */
/*export function combineSteps(
    stepsList: Array<ParsedSteps>,
    combine: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => ParsedStepsSummary
): ParsedStepsSummary {
    const combineAndReplace = (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => {
        const combined = combine(steps1, steps2)
        steps1.parent = replace(steps1, combined)
        steps1.childrenIndex = 0
        steps1.parent = replace(steps2, combined)
        steps1.childrenIndex = 1
    }
    let result = toSummary(stepsList[0])
    for (let i = 1; i < stepsList.length; i++) {
        result = combineRecursively(result, toSummary(stepsList[i]), combineAndReplace)
    }
    return result
}

function replace(steps: ParsedStepsSummary, replaceWith: ParsedStepsSummary): ParsedStepsSummary {
    const replaceParented: ParsedStepsSummary = {
        ...replaceWith,
        parent: steps.parent,
        childrenIndex: steps.childrenIndex,
    }
    if (steps.parent != null && steps.childrenIndex != null) {
        steps.parent.children![steps.childrenIndex] = replaceParented
    }
    return replaceParented
}

export function toSummary(steps: ParsedSteps, parent?: ParsedStepsSummary, childrenIndex?: number): ParsedStepsSummary {
    const result = Object.assign<ParsedSteps, SummaryInfo & { children?: any }>(
        { ...steps },
        {
            summarySize: 1,
            parent,
            childrenIndex,
        }
    )
    result.children = steps.children?.map((child, index) => toSummary(child, result, index))
    return result
}

function indexComplexStepsSummary(steps: ParsedStepsSummary): StepsMap {
    const map: StepsMap = new Map()
    function traverse(steps: ParsedStepsSummary): void {
        if (steps.children == null || steps.children.length === 0) {
            return
        }
        let set = map.get(steps.type)
        if (set == null) {
            set = new Set()
            map.set(steps.type, set)
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
    const root1 = getRoot(summary1)
    const root2 = getRoot(summary2)
    if (isEqual(root1, root2)) {
        return root1
    }
    combineAndReplace(root1, root2)
    return getRoot(root1)
}

function getRoot(steps: ParsedStepsSummary): ParsedStepsSummary {
    return steps.parent == null ? steps : getRoot(steps.parent)
}

function combineWithSet(
    mainEntry: ParsedStepsSummary,
    mainMap: StepsMap,
    foreignMap: StepsMap,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): void {
    const foreignEntries = foreignMap.get(mainEntry.type)
    if (foreignEntries != null) {
        for (const foreignEntry of foreignEntries) {
            if (isEqual(foreignEntry, mainEntry) || !stepsMatchable(foreignEntry, mainEntry)) {
                continue
            }

            if (combineTwoSteps(mainEntry, foreignEntry, combineAndReplace)) {
                if (mainEntry.parent != null) {
                    combineWithSet(mainEntry.parent, mainMap, foreignMap, combineAndReplace)
                }
                if (foreignEntry.parent != null) {
                    combineWithSet(foreignEntry.parent, foreignMap, mainMap, combineAndReplace)
                }
                break
            }
        }
    }
}

function combineTwoSteps(
    parent1: ParsedStepsSummary,
    parent2: ParsedStepsSummary,
    combineAndReplace: (steps1: ParsedStepsSummary, steps2: ParsedStepsSummary) => void
): boolean {
    const childSet1 = new Map<ParsedStepsSummary, number>(parent1.children!.map((child, index) => [child, index]))
    const childSet2 = new Map<ParsedStepsSummary, number>(parent2.children!.map((child, index) => [child, index]))

    let equalMatchesCount = 0

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(parent1, i1, parent2, i2) && isEqual(child1, child2)) {
                childSet1.delete(child1)
                childSet2.delete(child2)

                const summarySize = child1.summarySize + child2.summarySize
                child1.summarySize = summarySize
                child2.summarySize = summarySize

                ++equalMatchesCount
                break
            }
        }
    }

    if (equalMatchesCount === 0) {
        return false
    }

    if (equalMatchesCount < Math.max(parent1.children!.length, parent2.children!.length) / 2) {
        combineAndReplace(parent1, parent2)
        return true
    }

    for (const [child1, i1] of childSet1) {
        for (const [child2, i2] of childSet2) {
            if (isPotentialMatch(parent1, i1, parent2, i2)) {
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
        switch (parent1.type) {
            case "random":
                if (step1 != null && index1 != null) {
                    addRandomChild(step1, index1, parent1, parent2 as typeof parent1)
                }
                if (step2 != null && index2 != null) {
                    addRandomChild(step2, index2, parent2 as typeof parent1, parent1)
                }
                break
            default:
                throw new Error(`step of type "${parent1.type}" can't have empty matches`)
        }
    }

    const summarySize = parent1.summarySize + parent2.summarySize
    parent1.summarySize = summarySize
    parent2.summarySize = summarySize

    return true
}

function isPotentialMatch(parent1: ParsedStepsSummary, index1: number, parent2: ParsedStepsSummary, index2: number) {
    switch (parent1.type) {
        case "parallel":
            return true
        case "random":
            return true
        case "switch": {
            const cases1 = parent1.cases
            const cases2 = (parent2 as typeof parent1).cases
            return cases1[index1 - 1] === cases2[index2 - 1]
        }
        case "add":
        case "multiply":
        case "and":
        case "or":
        case "equal":
        case "unequal":
            return true
        default:
            //ordered match
            return index1 === index2
    }
}

function addRandomChild(steps: ParsedStepsSummary, index: number, mainParent: ParsedRandom, otherParent: ParsedRandom) {
    const probability = mainParent.probabilities[index]
    otherParent.children!.push(steps)
    otherParent.probabilities.push(probability * 0.5)
}

/**
 * compares everything except for the children of the steps
 */
/*function stepsMatchable(element1: ParsedStepsSummary, element2: ParsedStepsSummary) {
    switch (element1.type) {
        case "operation":
        case "getVariable":
        case "setVariable":
        case "symbol":
            return element1.identifier === (element2 as typeof element1).identifier
        case "raw":
            return element1.value === (element2 as typeof element1).value
        case "if": //same condition
            return isEqual(element1.children[0], (element2 as typeof element1).children[0])
        case "switch": //same switch value
            return element1.children[0] === (element2 as typeof element1).children[0]
        default:
            return true
    }
}
*/
