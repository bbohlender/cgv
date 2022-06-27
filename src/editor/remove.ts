import { HierarchicalParsedSteps, ParsedSteps, HierarchicalParsedGrammarDefinition, Operations } from ".."
import { PatternSelector, EditorState, PatternType } from "."
import { ValueMap, SelectionsList } from "./selection"
import { computeDependencies, toHierarchical } from "../util"
import produce from "immer"
import { replaceOnDraft, ReplaceWith } from "./replace"
import { AbstractParsedSteps } from "../parser"
import { removeUnusedNouns } from "./noun"
import { states } from "moo"

function getNeutralStep(
    parent: HierarchicalParsedSteps | HierarchicalParsedGrammarDefinition,
    childIndex: number | string,
    operations: Operations<any, any>
): ParsedSteps | undefined {
    if (Array.isArray(parent) || typeof childIndex == "string") {
        return {
            type: "this",
        }
    }
    const child = parent.children![childIndex]
    switch (parent.type) {
        case "operation": {
            const operation = operations[parent.identifier]
            if (operation == null) {
                break
            }
            const defaultParameterGenerator = operation.defaultParameters[childIndex]
            if (defaultParameterGenerator == null) {
                return {
                    type: "null",
                }
            }
            return defaultParameterGenerator()
        }
        case "sequential":
            return { type: "this" }
        case "parallel":
        case "random":
            return {
                type: child.type === "this" ? "null" : "this",
            }
        case "switch":
            if (childIndex === 0) {
                break
            }
            return {
                type: child.type === "this" ? "null" : "this",
            }
        case "if":
            if (childIndex === 0) {
                break
            }
            return {
                type: child.type === "this" ? "null" : "this",
            }
    }
    return undefined
}

export async function removeStep<T, A>(
    valueMap: ValueMap<T, A>,
    selectionsList: SelectionsList<T, A>,
    patterns: Array<PatternType<T, A>>,
    selectCondition: PatternSelector,
    operations: Operations<any, any>,
    grammar: HierarchicalParsedGrammarDefinition
): Promise<EditorState> {
    const replaceWith: ReplaceWith = (_, path, translatedPath) =>
        getNeutralStep(translatedPath[translatedPath.length - 2], path[path.length - 1], operations)
    const newGrammar = await produce(grammar, async (draft) => {
        await replaceOnDraft(valueMap, selectionsList, patterns, selectCondition, replaceWith, draft)
        for (const noun of draft) {
            noun.step = simplifyStepOnDraft(noun.step)
        }
        return toHierarchical(draft)
    })
    const partial = removeUnusedNouns(newGrammar, [])
    return {
        ...partial,
        dependencyMap: computeDependencies(partial.grammar),
        hovered: undefined,
    }
}

function simplifyStepOnDraft<T>(step: AbstractParsedSteps<T>): AbstractParsedSteps<T> {
    if (step.children == null) {
        return step
    }
    for (let i = step.children.length - 1; i >= 0; i--) {
        if (!deleteUnnecassaryStepChildOnDraft(step, i)) {
            step.children[i] = simplifyStepOnDraft(step.children[i])
        }
    }
    return simplifyStepItselfOnDraft(step)
}

function simplifyStepItselfOnDraft<T>(step: AbstractParsedSteps<T>): AbstractParsedSteps<T> {
    if (step.type === "if" && step.children[1].type === "this" && step.children[2].type === "this") {
        return { type: "this" }
    }
    if ((step.type === "parallel" || step.type === "sequential") && step.children.length === 1) {
        return step.children[0]
    }
    return step
}

/**
 * @returns true if the child was deleted
 */
function deleteUnnecassaryStepChildOnDraft<T>(
    parent: AbstractParsedSteps<T> & { children: Array<AbstractParsedSteps<T>> },
    childIndex: number
): boolean {
    const child: AbstractParsedSteps<T> | undefined = parent.children[childIndex]
    if (child == null) {
        return false
    }
    switch (parent.type) {
        case "sequential":
            if (child.type !== "this" || parent.children.length === 1) {
                return false
            }
            break
        case "parallel":
            if (child.type !== "null" || parent.children.length === 1) {
                return false
            }
            break
        case "random":
            if (child.type !== "null") {
                return false
            }
            parent.probabilities.splice(childIndex, 1)
            break
        case "switch":
            if (childIndex === 0) {
                return false
            }
            if (child.type !== "null") {
                return false
            }
            parent.cases.splice(childIndex - 1, 1)
            break
        default:
            return false
    }
    parent.children.splice(childIndex, 1)
    return true
}
