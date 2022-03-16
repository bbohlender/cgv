import { ParsedGrammarDefinition, ParsedSteps, ParsedSymbol } from ".."

export function removeInitialBrackets(steps: ParsedSteps): ParsedSteps {
    if (steps.type === "bracket") {
        return removeInitialBrackets(steps.children[0])
    }
    return steps
}

export function splitStepsToGrammar(steps: ParsedSteps): ParsedGrammarDefinition {
    return splitSteps(steps).reduce((grammar, [name, steps]) => ({ ...grammar, [name]: steps }), {})
}

/**
 * splits one ParsedSteps AST into multiple names ParsedSteps ASTs that refer each one using symbols by creating symbols out out multi referenced complex ParsedSteps
 *  - "complex" means "children != null && children > 0"
 *  - "multi referenced" means that the same ParsedStep reference is the children of multiple other ParsedSteps
 *  - use "equalizeSteps" to make sure that semantiallcy equal ParsedSteps have the same reference
 */
export function splitSteps(steps: ParsedSteps): Array<[string, ParsedSteps]> {
    const map = new Map<ParsedSteps, Array<{ parent: ParsedSteps; childrenIndex: number }>>()
    let ruleNameCounter = 1
    const stepsList: Array<[string, ParsedSteps]> = [[`s${ruleNameCounter++}`, steps]]

    traverseComplexSteps(steps, (parent, child, childrenIndex) => {
        let entries = map.get(child)
        if (entries == null) {
            entries = []
            map.set(child, entries)
        }
        if (entries.find((entry) => entry.parent === parent && entry.childrenIndex === childrenIndex) == null) {
            entries.push({
                parent,
                childrenIndex,
            })
        }
    })

    const multiReferencedComplexStepsList = Array.from(map.entries()).filter(([, entries]) => entries.length > 1)

    for (const [steps, entries] of multiReferencedComplexStepsList) {
        const ruleName = `s${ruleNameCounter++}`
        stepsList.push([ruleName, removeInitialBrackets(steps)])
        const newSymbolStep: ParsedSymbol = {
            identifier: ruleName,
            type: "symbol",
        }
        for (const { childrenIndex, parent } of entries) {
            parent.children![childrenIndex] = newSymbolStep
        }
    }
    return stepsList
}

function traverseComplexSteps(
    root: ParsedSteps,
    fn: (parent: ParsedSteps, child: ParsedSteps, childrenIndex: number) => void
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
