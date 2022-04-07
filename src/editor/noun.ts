import { remove, replace } from "."
import {
    Operations,
    AbstractParsedSymbol,
    HierarchicalParsedGrammarDefinition,
    toHierachical,
    HierarchicalParsedSteps,
    HierarchicalInfo,
} from ".."

export function removeNoun<T, A>(
    at: string,
    operations: Operations<T, A>,
    grammar: HierarchicalParsedGrammarDefinition
): HierarchicalParsedGrammarDefinition {
    //remove noun from grammar
    if (typeof at === "string") {
        delete grammar[at]
        const rootSteps = Object.values(grammar)
        if (rootSteps.length > 0) {
            for (const value of rootSteps) {
                findSymbolsWithIdentifier(value, at, (step) => remove(step, undefined, operations, grammar))
            }
        } else {
            Object.assign(grammar, toHierachical({ Start: { type: "this" } }))
        }
        return
    }
}

export function renameNoun(at: string, renameWith: string, grammar: HierarchicalParsedGrammarDefinition): HierarchicalParsedGrammarDefinition {
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
        findSymbolsWithIdentifier(value, at, (step) =>
            replace(
                step,
                undefined,
                {
                    type: "symbol",
                    identifier: renameWith,
                },
                grammar
            )
        )
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
