import {
    equalizeSteps,
    ParsedBracket,
    ParsedGrammarDefinition,
    ParsedSteps,
    replaceSymbolsGrammar,
    splitStepsToGrammar,
    trimSteps,
} from ".."

export function summarize(grammarDefinitions: Array<ParsedGrammarDefinition>): ParsedGrammarDefinition {
    const steps = grammarDefinitions.map(replaceSymbolsGrammar).map(([, steps]) => trimSteps(steps))
    const equalizedSteps = equalizeSteps(steps)
    const combinedSteps = combineSteps(equalizedSteps, combineAsRandom)
    return splitStepsToGrammar(combinedSteps)
}

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
export function combineAsRandom(steps1: ParsedSteps, steps2: ParsedSteps): ParsedSteps {
    return {
        type: "random",
        probabilities: [0.5, 0.5],
        children: [steps1, steps2],
    }
}

/**
 * traverses the ParsedSteps ASTs and try to combine each ParsedSteps with the ParsedSteps of the other ASTs
 * ParsedSteps are combined if they have the same ParsedStep.type and at least one equal child
 * a step is combined unordered (matching children don't need to have the same index) if a ParsedStep is a ParsedParallel step
 */
export function combineSteps(
    stepsList: Array<ParsedSteps>,
    combine: (steps1: ParsedSteps, steps2: ParsedSteps) => ParsedSteps
): ParsedSteps {
    const combined = stepsList.reduce((prev, cur) => combineTwoSteps(prev, cur, combine))
    //TODO: unify nested combinations
    return combined
}

function combineTwoSteps(
    steps1: ParsedSteps,
    steps2: ParsedSteps,
    combine: (steps1: ParsedSteps, steps2: ParsedSteps) => ParsedSteps
): ParsedSteps {
    const map = new Map<ParsedSteps["type"], Array<EntryParsedSteps>>()
    const entry1 = traverseComplexSteps(
        (entry) => {
            let entriesWithSameType = map.get(entry.element.type)
            if (entriesWithSameType == null) {
                entriesWithSameType = []
                map.set(entry.element.type, entriesWithSameType)
            }
            entriesWithSameType.push(entry)
        },
        undefined,
        steps1,
        undefined
    )
    const entry2 = traverseComplexSteps(
        (entry) => {
            const entriesInMap = map.get(entry.element.type)
            if (entriesInMap != null) {
                for (const entryInMap of entriesInMap) {
                    if(entryInMap.element == entry.element) {
                        continue
                    }
                    const equalChildAmount = countEqualChilds(entryInMap.element, entry.element)
                    if (equalChildAmount === 0) {
                        continue
                    }
                    //TODO: unordered & different amount of children
                    const allChildrenAmount = entry.element.children!.length // entryInMap.element.children!.length

                    if(equalChildAmount >= allChildrenAmount / 2) {
                        for(let i = 0; i < allChildrenAmount; i++) {
                            const e1 = entry.element.children![i]
                            const e2 = entryInMap.element.children![i]
                            if(e1 != e2) {
                                const combined = combine(e1, e2)
                                changeElement(..., combined) //we need the child of entry at position i here
                                changeElement(..., combined) //we need the child of entryInMap at position i here
                            }
                        }
                        changeElement(entryInMap, entry.element)
                    } else {
                        const combined = combine(entryInMap.element, entry.element)
                        changeElement(entryInMap, combined)
                        changeElement(entry, combined)
                    }
                }
            }
        },
        undefined,
        steps2,
        undefined
    )

    if (entry1.element != entry2.element) {
        return combine(entry1.element, entry2.element)
    }

    return entry1.element
}

function changeElement(entry: EntryParsedSteps, steps: ParsedSteps): void {
    entry.element = steps
    if (entry.parent != null) {
        entry.parent.element.children![entry.childrenIndex!] = steps
    }
}

function parsedStepsToEntry(steps: ParsedSteps, parent?: EntryParsedSteps, childrenIndex?: number): EntryParsedSteps {
    const value: EntryParsedSteps = {
        childrenIndex,
        element: steps,
        parent,
    }
    return value
}

type EntryParsedSteps = {
    parent: EntryParsedSteps | undefined
    childrenIndex: number | undefined
    element: ParsedSteps
}

function countEqualChilds(s1: ParsedSteps, s2: ParsedSteps, unordered = false): number {
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

/**
 * the fn function is executed for the deepest and least element at first
 */
function traverseComplexSteps<T>(
    fn: (entry: EntryParsedSteps) => T,
    parent: EntryParsedSteps | undefined,
    element: ParsedSteps,
    childrenIndex: number | undefined
): EntryParsedSteps {
    const entry = parsedStepsToEntry(element, parent, childrenIndex)
    if (element.children != null && element.children.length > 0) {
        element.children.forEach(traverseComplexSteps.bind(null, fn, entry))
        fn(entry)
    }
    return entry
}
