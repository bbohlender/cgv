import produce, { freeze, original } from "immer"
import { EditorState, ValueMap, SelectionsList, PatternType, PatternSelector } from "."
import {
    toHierarchicalSteps,
    ParsedNounReference,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalInfo,
} from ".."
import { ParsedDescription, ParsedDescription, ParsedTransformation } from "../parser"
import {
    computeDependencies,
    DependencyMap,
    getDescriptionOfNoun,
    getIndexRelation,
    getNounIndex,
    globalizeDescription,
    globalizeNoun,
    HierarchicalRelation,
    localizeDescription,
    localizeNoun,
    traverseSteps,
} from "../util"
import { insert } from "./insert"
import { replaceOnDraft } from "./replace"
import { getIndirectParentsSteps, getRelatedSelections, getSelectedStepsPath } from "./selection"

export function removeUnusedNouns<T>(
    grammar: ParsedDescription<T>,
    selectionsList: SelectionsList<any>,
    descriptionNames?: Array<string>
): { selectionsList: SelectionsList<any>; grammar: ParsedDescription<T> } {
    const usedNouns = new Set<string>()
    const foundDescriptions = new Set<string>()
    for (const { name: rootName, step: rootStep } of grammar) {
        const descriptionName = getDescriptionOfNoun(rootName)
        if (
            !foundDescriptions.has(descriptionName) &&
            (descriptionNames == null || descriptionNames.includes(descriptionName))
        ) {
            usedNouns.add(rootName)
            foundDescriptions.add(descriptionName)
        }
        traverseSteps(rootStep, (steps) => {
            if (steps.type === "symbol" && steps.identifier !== rootName) {
                usedNouns.add(steps.identifier)
            }
        })
    }
    return {
        grammar: freeze(grammar.filter((noun) => usedNouns.has(noun.name))),
        selectionsList: selectionsList.filter((selections) => usedNouns.has(getSelectedStepsPath(selections.steps)[0])),
    }
}

export async function setName<T>(
    indicesMap: ValueMap<T>,
    selectionsList: SelectionsList<T>,
    patterns: Array<PatternType<T>>,
    selectCondition: PatternSelector,
    name: string,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const nounIndex = getNounIndex(name, grammar)
    if (nounIndex == null) {
        grammar = produce(grammar, (draft) => {
            draft.push({ name, step: { type: "this", path: [name] } })
        })
    }
    const state = await insert(
        indicesMap,
        selectionsList,
        patterns,
        selectCondition,
        "after",
        () => ({ type: "symbol", identifier: name }),
        grammar
    )
    return {
        ...state,
        selectionsList: [{ steps: name, values: [] }],
    }
}

export function copyNoun(
    globalDescription: ParsedDescription,
    localNounName: string,
    fromDescriptionName: string,
    toDescriptionName: string,
    added = new Set<string>()
): HierarchicalParsedGrammarDefinition {
    const oldGlobalNounName = globalizeNoun(localNounName, fromDescriptionName)
    const newGlobalNounName = globalizeNoun(localNounName, toDescriptionName)
    const noun = globalDescription.find((noun) => noun.name === oldGlobalNounName)
    if (noun == null) {
        throw new Error(`unknown noun "${oldGlobalNounName}"`)
    }
    const missingDependencies: Array<{ localNounName: string; descriptionName: string }> = []
    const newStep = produce(noun.step, (draft) => {
        traverseSteps(draft, (step) => {
            if (step.type === "symbol") {
                const descriptionName = getDescriptionOfNoun(step.identifier)
                if (descriptionName == toDescriptionName) {
                    return
                }
                const localNounName = localizeNoun(step.identifier, descriptionName)
                const newGlobalNounName = globalizeNoun(localNounName, toDescriptionName)
                step.identifier = newGlobalNounName
                if (
                    globalDescription.find((noun) => noun.name === newGlobalNounName) == null && //checks if the noun already exisits in the destination description
                    !added.has(localNounName) //to prevent endless loops in recursive descriptions
                ) {
                    missingDependencies.push({
                        localNounName: localNounName,
                        descriptionName: descriptionName,
                    })
                }
            }
        })
        return toHierarchicalSteps(draft, newGlobalNounName)
    }) as HierarchicalParsedSteps

    added.add(localNounName)

    const copiedNoun: HierarchicalParsedGrammarDefinition[number] = {
        name: newGlobalNounName,
        step: newStep,
    }

    return freeze(
        missingDependencies.reduce<HierarchicalParsedGrammarDefinition>(
            (prev, { descriptionName, localNounName }) =>
                prev.concat(copyNoun(globalDescription, localNounName, descriptionName, toDescriptionName, added)),
            [copiedNoun]
        )
    )
}

export async function renameNoun<T>(
    indicesMap: ValueMap<T>,
    selectionsList: SelectionsList<T>,
    patterns: Array<PatternType<T>>,
    selectCondition: PatternSelector,
    newName: string,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const partial = await produce(
        { grammar, selectionsList: [] as SelectionsList },
        async ({ grammar: draft, selectionsList: newSelectionsList }) => {
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
                const clonedSteps = toHierarchicalSteps(freeze(grammar[existingNounIndex].step, false), newName)!

                draft.splice(existingNounIndexOnDraft, 0, {
                    name: newName,
                    step: clonedSteps,
                })

                const parents = getIndirectParentsSteps(name, draft)
                if (parents.length > 0) {
                    const upwardSelections = getRelatedSelections(
                        indicesMap,
                        parents,
                        selections.values,
                        (current, next) => {
                            const relation = getIndexRelation(current.before.index, next.before.index)
                            return (
                                relation === HierarchicalRelation.Predecessor || relation === HierarchicalRelation.Equal
                            )
                        },
                        undefined
                    )

                    await replaceOnDraft(
                        indicesMap,
                        upwardSelections,
                        patterns,
                        selectCondition,
                        () => ({ type: "symbol", identifier: newName }),
                        draft
                    )
                }

                newSelectionsList.push({
                    steps: newName,
                    values: [],
                })
            }
        }
    )
    const cleanedPartial = removeUnusedNouns(partial.grammar, partial.selectionsList)
    return {
        hovered: undefined,
        ...cleanedPartial,
        dependencyMap: computeDependencies(cleanedPartial.grammar),
    }
}

export function findSymbolsWithIdentifier(
    root: HierarchicalParsedSteps,
    identifier: string,
    onFound: (step: ParsedNounReference<HierarchicalInfo>) => void
): void {
    traverseSteps(root, (step) => {
        if (step.type === "symbol" && step.identifier === identifier) {
            onFound(step)
        }
    })
}
