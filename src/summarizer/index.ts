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
    const combinedStep = combineAsRandom(combinedSteps)
    return splitStepsToGrammar(combinedStep)
}

/**
 * groups the ParsedSteps into groups to then distribute the probability
 * the groups are established based on equality of the ParsedSteps
 * if there is only one resulting group, the ParsedStep itself is returned
 */
export function combineAsRandom(stepsList: Array<ParsedSteps>): ParsedSteps {
    const map = new Map<ParsedSteps, number>()
    for (const steps of stepsList) {
        let entry = map.get(steps)
        if (entry == null) {
            entry = 0
        }
        map.set(steps, entry + 1)
    }
    const values = Array.from(map.entries())

    if (values.length === 1) {
        return values[0][0]
    }

    const probabilities = values.map(([, amount]) => amount / stepsList.length)
    const children = values.map(([steps]) => steps)
    return {
        type: "random",
        probabilities,
        children,
    }
}

/**
 * traverses the ParsedSteps ASTs and try to combine each ParsedSteps with the ParsedSteps of the other ASTs
 * ParsedSteps are combined if they have the same ParsedStep.type and at least one equal child
 * a step is combined unordered (matching children don't need to have the same index) if a ParsedStep is a ParsedParallel step
 */
export function combineSteps(
    stepsList: Array<ParsedSteps>,
    combine: (stepsList: Array<ParsedSteps>) => ParsedSteps
): Array<ParsedSteps> {
    //TODO: nesting is not working

    const bracketedStepsList: Array<ParsedBracket> = stepsList.map((steps) => ({ type: "bracket", children: [steps] }))
    const map = new Map<
        ParsedSteps["type"],
        Array<{ parent: ParsedSteps; childrenIndex: number; element: ParsedSteps }>
    >()
    for (const steps of bracketedStepsList) {
        traverseComplexSteps(steps, (parent, element, childrenIndex) => {
            let entry = map.get(element.type)
            if (entry == null) {
                entry = []
                map.set(element.type, entry)
            }
            entry.push({
                parent,
                element: element,
                childrenIndex,
            })
        })
    }
    for (const [type, entries] of map) {
        const groups: Array<Array<{ parent: ParsedSteps; childrenIndex: number; element: ParsedSteps }>> = []
        //TODO: for type === "parllel" use unordered matching
        entries.forEach((element) => {
            for (const group of groups) {
                for (const groupEntry of group) {
                    //TODO: check for the same stap attributes (e.g. variable identifier, or operation identifier)
                    if (hasOneEqualChild(element.element, groupEntry.element)) {
                        group.push(element)
                        return
                    }
                }
            }
            groups.push([element])
        })
        for (const group of groups) {
            const replacement = combine(group.map(({ element }) => element))
            for (const { parent, childrenIndex } of group) {
                parent.children![childrenIndex] = replacement
            }
        }
    }
    return bracketedStepsList.map(({ children: [steps] }) => steps)
}

function hasOneEqualChild(s1: ParsedSteps, s2: ParsedSteps, unordered = false): boolean {
    if (unordered) {
        //TODO: unordered
    } else {
        if (s1.children!.length != s2.children!.length) {
            throw new Error(`children length can't be unequal if the matching is ordered`)
        }

        for (let i = 0; i < s1.children!.length; i++) {
            if (s1.children![i] == s2.children![i]) {
                return true
            }
        }
    }
    return false
}

function traverseComplexSteps(
    root: ParsedSteps,
    fn: (parent: ParsedSteps, element: ParsedSteps, childrenIndex: number) => void
): void {
    if (root.children == null) {
        return
    }
    root.children.forEach((child, i) => {
        if (child.children != null && child.children.length > 0) {
            fn(root, child, i)
            traverseComplexSteps(child, fn)
        }
    })
}
