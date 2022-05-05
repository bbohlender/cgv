import { HierarchicalParsedSteps, ParsedSteps, HierarchicalParsedGrammarDefinition, Operations } from ".."
import { EditorState } from "."
import { IndicesMap, SelectionsList } from "./selection"
import { computeDependencies, toHierarchical } from "../util"
import produce from "immer"
import { replaceOnDraft, ReplaceWith } from "./replace"
import { AbstractParsedGrammarDefinition, AbstractParsedSteps, AbstractParsedSymbol } from "../parser"

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
                type: "null",
            }
        case "switch":
            if (childIndex === 0) {
                break
            }
            return { type: "null" }
        case "if":
            if (childIndex === 0) {
                break
            }
            return { type: "null" }
    }
    return undefined
}

export function removeStep(
    indicesMap: IndicesMap,
    selectionsList: SelectionsList,
    operations: Operations<any, any>,
    grammar: HierarchicalParsedGrammarDefinition
): EditorState {
    const replaceWith: ReplaceWith = (_, path, translatedPath) =>
        getNeutralStep(translatedPath[translatedPath.length - 2], path[path.length - 1], operations)
    const result = produce(grammar, (draft) => {
        replaceOnDraft(indicesMap, selectionsList, replaceWith, draft)
        simplfyGrammarOnDraft(draft, operations)
        return toHierarchical(draft)
    })
    return {
        grammar: result,
        dependencyMap: computeDependencies(result),
        selectionsList: [],
        indicesMap: {},
        hovered: undefined,
    }
}

function simplfyGrammarOnDraft(grammar: HierarchicalParsedGrammarDefinition, operations: Operations<any, any>): void {
    for (const noun of grammar) {
        noun.step = simplifyStepOnDraft(grammar, noun.step, operations)
    }
    toHierarchical(grammar)
}

function simplifyStepOnDraft<T>(
    grammar: HierarchicalParsedGrammarDefinition,
    step: AbstractParsedSteps<T>,
    operations: Operations<any, any>
): AbstractParsedSteps<T> {
    if (step.children == null) {
        return step
    }
    for (let i = step.children.length - 1; i >= 0; i--) {
        if (!deleteUnnecassaryStepChildOnDraft(step, grammar, i, operations)) {
            step.children[i] = simplifyStepOnDraft(grammar, step.children[i], operations)
        }
    }
    return simplifyStepItselfOnDraft(step)
}

function simplifyStepItselfOnDraft<T>(step: AbstractParsedSteps<T>): AbstractParsedSteps<T> {
    if ((step.type === "parallel" || step.type === "sequential") && step.children.length === 1) {
        return step.children[0]
    }
    return step
}

function resolveSymbol<T>(
    steps: AbstractParsedSymbol<T>,
    grammar: AbstractParsedGrammarDefinition<T>,
    visited = new Set<string>()
): AbstractParsedSteps<T> | undefined {
    if (visited.has(steps.identifier)) {
        return undefined
    }
    visited.add(steps.identifier)
    const noun = grammar.find((noun) => noun.name === steps.identifier)
    if (noun == null) {
        return undefined
    }
    if (noun.step.type === "symbol") {
        return resolveSymbol(noun.step, grammar, visited)
    }
    return noun.step
}

/**
 * @returns true if the child was deleted
 */
function deleteUnnecassaryStepChildOnDraft<T>(
    parent: AbstractParsedSteps<T> & { children: Array<AbstractParsedSteps<T>> },
    grammar: AbstractParsedGrammarDefinition<T>,
    childIndex: number,
    operations: Operations<any, any>
): boolean {
    let child: AbstractParsedSteps<T> | undefined = parent.children[childIndex]
    if (child.type === "symbol") {
        child = resolveSymbol(child, grammar)
    }
    if (child == null) {
        return false
    }
    switch (parent.type) {
        case "sequential":
            if (child.type !== "this") {
                return false
            }
            break
        case "parallel":
            if (child.type !== "null") {
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
