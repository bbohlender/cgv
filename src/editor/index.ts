import {
    HierarchicalParsedSteps,
    ParsedSteps,
    Operations,
    AbstractParsedSymbol,
    HierarchicalInfo,
    HierarchicalParsedGrammarDefinition,
    toHierachicalSteps,
} from ".."
import { createDefaultStep, getDefaultChildAtIndex, StepDescriptor } from "./default-step"

//TODO: prevent removing last noun

export function remove<T, A>(
    at: HierarchicalParsedSteps | string,
    operations: Operations<T, A>,
    grammar: HierarchicalParsedGrammarDefinition
): void {
    //remove noun from grammar
    if (typeof at === "string") {
        delete grammar[at]
        for (const value of Object.values(grammar)) {
            findSymbolsWithIdentifier(value, at, (step) => remove(step, operations, grammar))
        }
        return
    }

    //remove root of noun and replace with empty sequence
    if (at.childrenIndex == null) {
        replaceStep(
            at,
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
            if (at.parent.children.length != 2) {
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
        case "bracket":
            //remove parent (bracket)
            remove(at.parent, operations, grammar)
            return
    }

    const defaultChild = getDefaultChildAtIndex(at.parent, operations, at.childrenIndex)
    if (defaultChild == null) {
        at.parent.children!.splice(at.childrenIndex, 1)
        for (let i = at.childrenIndex; i < at.parent.children!.length; i++) {
            at.parent.children![i].childrenIndex! = i
        }
    } else {
        replaceStep(at, defaultChild, grammar)
    }
}

function findSymbolsWithIdentifier(
    root: HierarchicalParsedSteps,
    identifier: string,
    onFound: (step: AbstractParsedSymbol<HierarchicalInfo>) => void
): void {
    if (root.type === "symbol" && root.identifier === identifier) {
        onFound(root)
        return
    }
    if (root.children == null) {
        return
    }
    for (const child of root.children) {
        findSymbolsWithIdentifier(child, identifier, onFound)
    }
}

export function replace(
    at: HierarchicalParsedSteps,
    descriptor: StepDescriptor,
    operations: Operations<any, any>,
    grammar: HierarchicalParsedGrammarDefinition
) {
    return replaceStep(at, createDefaultStep(descriptor, operations, grammar), grammar)
}

export function replaceStep(
    at: HierarchicalParsedSteps,
    replaceWith: ParsedSteps,
    grammar: HierarchicalParsedGrammarDefinition
): HierarchicalParsedSteps {
    //create new step
    const insert = toHierachicalSteps(replaceWith, at.parent, at.childrenIndex)

    //place inside parent
    if (at.childrenIndex == null) {
        grammar[at.parent] = insert
    } else {
        at.parent.children![at.childrenIndex] = insert
    }
    return insert
}

export function rename(at: string, renameWith: string, grammar: HierarchicalParsedGrammarDefinition): void {
    if (renameWith in grammar) {
        throw new Error(`can't  rename noun "${at}" into "${renameWith}" since it already exisits`)
    }
    const entry = grammar[at]
    if (entry == null) {
        throw new Error(`can't rename non exisiting noun "${at}"`)
    }
    delete grammar[at]
    grammar[renameWith] = entry
    entry.parent = renameWith
    for (const value of Object.values(grammar)) {
        findSymbolsWithIdentifier(value, at, (step) => (step.identifier = renameWith))
    }
}

export function getLabel(descriptor: StepDescriptor) {
    if (descriptor.type === "operation") {
        return descriptor.identifier
    }
    return descriptor.type
}

export function add(
    position: "before" | "after" | "parallel",
    at: HierarchicalParsedSteps | string,
    descriptor: StepDescriptor,
    operations: Operations<any, any>,
    grammar: HierarchicalParsedGrammarDefinition
): HierarchicalParsedSteps {
    const type = position === "parallel" ? "parallel" : "sequential"
    if (typeof at === "string") {
        if (!(at in grammar)) {
            throw new Error(`noun "${at}" does not exisits`)
        }
        return add(position, grammar[at], descriptor, operations, grammar)
    }

    const step = createDefaultStep(descriptor, operations, grammar)

    if (at.childrenIndex != null && at.parent.type === type) {
        const index = at.childrenIndex! + (position == "before" ? 0 : 1)
        const insert = toHierachicalSteps(step, at.parent, index)
        at.parent.children.splice(index, 0, insert)

        for (let i = index + 1; i < at.parent.children!.length; i++) {
            at.parent.children![i].childrenIndex! = i
        }

        return insert
    } else {
        const newParent: ParsedSteps = {
            type,
            children: position === "before" ? [step, at] : [at, step],
        }
        return replaceStep(at, newParent, grammar)
    }
}

export * from "./default-step"
