import produce from "immer"
import { EditorState } from "."
import {
    toHierarchicalSteps,
    AbstractParsedSymbol,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalInfo,
} from ".."

/*export function removeNounOnDraft<T, A>(
    name: string,
    operations: Operations<T, A>,
    grammar: HierarchicalParsedGrammarDefinition
): EditorResult {
    return {
        grammar: produce(grammar, (draft) => {
            //remove noun from grammar
            delete draft[name]
            const rootSteps = Object.values(draft)
            if (rootSteps.length === 0) {
                return toHierachical({ Start: { type: "this" } })
            }
            for (const value of rootSteps) {
                findSymbolsWithIdentifier(value, name, (step) => {
                    //TODO: remove symbols with name
                    removeStepOnDraft(draft, path)
                })
            }
        }),
        selections: [],
    }
}*/

export function renameNoun(
    name: string,
    newName: string,
    grammar: HierarchicalParsedGrammarDefinition
): Omit<EditorState, "indicesMap"> {
    return {
        grammar: produce(grammar, (draft) => {
            if (newName in draft) {
                throw new Error(`can't  rename noun "${name}" into "${newName}" since it already exisits`)
            }
            const entry = draft[name]
            if (entry == null) {
                throw new Error(`can't rename non exisiting noun "${name}"`)
            }
            delete draft[name]
            draft[newName] = toHierarchicalSteps(entry, newName)
            for (const value of Object.values(draft)) {
                findSymbolsWithIdentifier(value, name, (step) => (step.identifier = newName))
            }
        }),
        selectionsList: [],
        hovered: undefined
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
