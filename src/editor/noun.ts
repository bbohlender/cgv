import produce, { current, freeze } from "immer"
import { EditorState, IndicesMap, SelectionsList } from "."
import {
    toHierarchicalSteps,
    AbstractParsedSymbol,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalInfo,
} from ".."
import { AbstractParsedSteps } from "../parser"
import { computeDependencies, getNounIndex, traverseSteps } from "../util"
import { insert } from "./insert"
import { replaceOnDraft } from "./replace"
import { getIndirectParentsSteps, getRelatedSelections } from "./selection"

export function removeUnusedNouns(grammar: HierarchicalParsedGrammarDefinition): HierarchicalParsedGrammarDefinition {
    const usedNouns = new Set([grammar[0].name]) //pre add the first entry
    for (const { name: rootName, step: rootStep } of grammar) {
        traverseSteps(rootStep, (steps) => {
            if (steps.type === "symbol" && steps.identifier !== rootName) {
                usedNouns.add(steps.identifier)
            }
        })
    }
    return produce(grammar, (draft) => {
        for (let i = draft.length - 1; i >= 0; i--) {
            if (!usedNouns.has(draft[i].name)) {
                draft.splice(i, 1)
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
    const nounIndex = getNounIndex(name, grammar)
    if (nounIndex == null) {
        grammar = produce(grammar, (draft) => {
            draft.push({ name, step: { type: "this", path: [name] } })
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
    const partial = produce(
        { grammar, selectionsList: [] as SelectionsList },
        ({ grammar: draft, selectionsList: newSelectionsList }) => {
            for (const selections of selectionsList) {
                if (typeof selections.steps !== "string") {
                    continue
                }
                const name = selections.steps
                const existingNounIndex = getNounIndex(name, grammar)
                const existingNounIndexOnDraft = getNounIndex(name, draft)
                if (
                    getNounIndex(newName, draft) != null ||
                    existingNounIndex == null ||
                    existingNounIndexOnDraft == null
                ) {
                    continue
                }

                //this clones the step as we use the frozen grammar[index].step (and toHierarchicalSteps internally uses produce if the parameter is frozen)
                const clonedSteps = toHierarchicalSteps(freeze(grammar[existingNounIndex].step, false), newName)

                draft.splice(existingNounIndexOnDraft, 0, {
                    name: newName,
                    step: clonedSteps,
                })

                const parents = getIndirectParentsSteps(name, draft)
                if (parents.length > 0) {
                    const upwardSelections = getRelatedSelections(
                        indicesMap,
                        parents,
                        selections.indices,
                        (current, next) => current.before.startsWith(next.before),
                        undefined
                    )

                    replaceOnDraft(indicesMap, upwardSelections, () => ({ type: "symbol", identifier: newName }), draft)
                }

                newSelectionsList.push({
                    steps: newName,
                    indices: [],
                })
            }
        }
    )
    const newGrammar = removeUnusedNouns(partial.grammar)
    return {
        hovered: undefined,
        indicesMap: {},
        selectionsList: partial.selectionsList,
        grammar: newGrammar,
        dependencyMap: computeDependencies(newGrammar),
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
