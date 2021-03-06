import produce, { current, isDraft } from "immer"
import { getNounIndex, getNounStep, setNounStep } from "."
import { ParsedGrammarDefinition, ParsedSteps, AbstractParsedGrammarDefinition, AbstractParsedSteps } from ".."

export type HierarchicalPath = [string, ...Array<number>]
export type HierarchicalInfo = { path: HierarchicalPath }
export type HierarchicalParsedSteps<T = unknown> = AbstractParsedSteps<HierarchicalInfo & T>
export type HierarchicalParsedGrammarDefinition<T = unknown> = AbstractParsedGrammarDefinition<HierarchicalInfo & T>

export type TranslatedPath<I> = [
    AbstractParsedGrammarDefinition<I>,
    AbstractParsedSteps<I>,
    ...Array<AbstractParsedSteps<I>>
]

export function translatePath<I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    [name, ...rest]: HierarchicalPath
): TranslatedPath<I> | undefined {
    let current = getNounStep(name, grammar)
    if (current == null) {
        return undefined
    }
    const path: TranslatedPath<I> = [grammar, current]
    for (const index of rest) {
        if (current.children == null) {
            return undefined
        }
        current = current.children[index]
        path.push(current)
    }
    return path
}

export function setAtPath<I>(
    path: HierarchicalPath,
    translatedPath: TranslatedPath<I & HierarchicalInfo>,
    pathIndex: number,
    set: AbstractParsedSteps<I>
): void {
    if (pathIndex === 0) {
        const nounName = path[0]
        setNounStep(nounName, translatedPath[0], toHierarchicalSteps(set, nounName))
        return
    }
    const step = translatedPath[pathIndex] as AbstractParsedSteps<I>
    const index = path[pathIndex] as number
    step.children![index] = toHierarchicalSteps(set, ...(path.slice(0, pathIndex + 1) as HierarchicalPath))
}

export function getAtPath<I>(path: TranslatedPath<I>, pathIndex: number): AbstractParsedSteps<I> {
    if (pathIndex < 0) {
        throw new Error(`can't retrieve step at path index ${pathIndex}`)
    }
    return path[pathIndex + 1] as AbstractParsedSteps<I>
}

export function removeHierarchicalFromDescription(
    description: HierarchicalParsedGrammarDefinition
): ParsedGrammarDefinition {
    return description.map(({ name, step }) => ({ name, step: removeHierarchicalFromStep(step) }))
}

export function removeHierarchicalFromStep({ path, children, ...step }: HierarchicalParsedSteps): ParsedSteps {
    if (children == null) {
        return step as ParsedSteps
    }
    return {
        ...step,
        children: children.map((child) => removeHierarchicalFromStep(child)),
    } as ParsedSteps
}

export function toHierarchicalSteps<T = unknown>(
    steps: AbstractParsedSteps<T>,
    ...basePath: HierarchicalPath
): HierarchicalParsedSteps<T> {
    if (steps == null) {
        throw new Error(`can't make undefined hierarchical`)
    }
    const hierachicalSteps = steps as HierarchicalParsedSteps
    if (Object.isFrozen(hierachicalSteps)) {
        return produce(hierachicalSteps, (draft) => toHierarchicalSteps(draft, ...basePath))
    }
    if (hierachicalSteps.path == null) {
        hierachicalSteps.path = basePath
    } else {
        hierachicalSteps.path.length = basePath.length
        for (let i = 0; i < basePath.length; i++) {
            hierachicalSteps.path[i] = basePath[i]
        }
    }
    if (steps.children != null) {
        for (let i = 0; i < steps.children.length; i++) {
            steps.children[i] = toHierarchicalSteps(steps.children[i], ...basePath, i)
        }
    }
    return hierachicalSteps
}

export function toHierarchical<T = unknown>(
    grammar: AbstractParsedGrammarDefinition<T>
): HierarchicalParsedGrammarDefinition<T> {
    if (grammar == null) {
        throw new Error(`can't make undefined hierarchical`)
    }
    if (Object.isFrozen(grammar)) {
        return produce(grammar, (draft) => toHierarchical(draft)) as HierarchicalParsedGrammarDefinition<T>
    }
    for (const noun of grammar) {
        noun.step = toHierarchicalSteps(noun.step, noun.name)
    }
    return grammar as HierarchicalParsedGrammarDefinition<T>
}
