import { Operations, HierarchicalParsedSteps, HierarchicalParsedGrammarDefinition } from ".."
import { getDefaultChildAtIndex, replace, Selections } from "."
import { replaceStep } from "./replace"

export function remove<T, A>(
    at: HierarchicalParsedSteps,
    selections: Selections,
    operations: Operations<T, A>,
    grammar: HierarchicalParsedGrammarDefinition
): void {
    //remove root of noun and replace with empty sequence
    if (at.childrenIndex == null) {
        replace(
            at,
            selections,
            {
                type: "this",
            },
            grammar
        )
        return
    }

    switch (at.parent.type) {
        case "parallel":
        case "sequential": {
            if (at.parent.children.length != 2 || selections != null) {
                break
            }
            const otherChild = at.parent.children!.find((child) => child != at)
            if (otherChild == null) {
                throw new Error(
                    `unable to find more then one distinct child when removing a child from a ${at.parent.type} step`
                )
            }
            replaceStep(at.parent, otherChild, grammar)
            return
        }
        case "symbol":
            throw new Error(`can't delete an step if it's is a symbol and has no children`)
        case "switch":
            if (at.childrenIndex > 0) {
                at.parent.cases.splice(at.childrenIndex - 1, 1)
            }
            break
        case "random":
            at.parent.probabilities.splice(at.childrenIndex, 1)
            break
    }

    const defaultChild = getDefaultChildAtIndex(at.parent, operations, at.childrenIndex)
    if (defaultChild == null) {
        replace(
            at.parent,
            {
                ...at.parent,
                children: at.parent.children?.filter((_, i) => i != at.childrenIndex) as any,
            },
            grammar
        )
    } else {
        replace(at, defaultChild, grammar)
    }
}
