import produce from "immer"
import { EditorState, IndicesMap, SelectionsList } from "."
import {
    toHierarchicalSteps,
    AbstractParsedSymbol,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalInfo,
} from ".."
import { insert } from "./insert"
import { replaceOnDraft } from "./replace"

export function removeUnusedNouns(grammar: HierarchicalParsedGrammarDefinition): HierarchicalParsedGrammarDefinition {
    const entries = Object.entries(grammar)
    const usedNouns = new Set([entries[0][0]]) //pre add the first entry
    for (const [rootName, rootSteps] of entries) {
        traverseSteps(rootSteps, (steps) => {
            if (steps.type === "symbol" && steps.identifier !== rootName) {
                usedNouns.add(steps.identifier)
            }
        })
    }
    return produce(grammar, (draft) => {
        for (const name of Object.keys(draft)) {
            if (!usedNouns.has(name)) {
                delete draft[name]
            }
        }
    })
}

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

export function setName(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    name: string,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    if (grammar[name] == null) {
        grammar = produce(grammar, (draft) => {
            draft[name] = { type: "this", path: [name] }
        })
    }
    const state = insert(indicesMap, selectionsList, "after", () => ({ type: "symbol", identifier: name }), grammar)
    return {
        ...state,
        selectionsList: [{ steps: name, indices: [] }],
    }
}

export function renameNoun(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    newName: string,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const partial = produce({ grammar, selectionsList: [] }, () => {
        for (const selections of selectionsList) {
            if (typeof selections.steps !== "string") {
                continue
            }
            const name = selections.steps
            if (grammar[newName] != null || grammar[name] == null) {
                continue
            }

            const editedGrammar = produce(grammar, (draft) => {
                const entry = draft[name]
                draft[newName] = //TODO: copy
            })

            replaceOnDraft(indicesMap, , () => ({ type: "" }), editedGrammar)
        }
    })
    return {
        hovered: undefined,
        indicesMap: {},
        selectionsList: partial.selectionsList,
        grammar: removeUnusedNouns(partial.grammar),
    }
}

export function findSymbolsWithIdentifier(
    root: HierarchicalParsedSteps,
    identifier: string,
    onFound: (step: AbstractParsedSymbol<HierarchicalInfo>) => void
): void {
    traverseSteps(root, (step) => {
        if (step.type === "symbol" && step.identifier === identifier) {
            onFound(step)
        }
    })
}

export function traverseSteps(root: HierarchicalParsedSteps, cb: (step: HierarchicalParsedSteps) => void) {
    cb(root)
    if (root.children == null) {
        return
    }
    for (const child of root.children) {
        traverseSteps(child, cb)
    }
}
