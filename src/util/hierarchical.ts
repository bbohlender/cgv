import { AbstractParsedGrammarDefinition, AbstractParsedSteps } from ".."
import { ParsedGrammarDefinition, ParsedSteps } from "../parser"

export type HierarchicalPath = [string, ...Array<number>]
export type HierarchicalInfo = { path: HierarchicalPath }
export type HierarchicalParsedSteps = AbstractParsedSteps<HierarchicalInfo>
export type HierarchicalParsedGrammarDefinition = AbstractParsedGrammarDefinition<HierarchicalInfo>

/**
 * walk() - walks to the end
 * walk(1) - walks 1 steps
 * walk(-1) - walks to 1 steps before the end
 */
export function createPathWalker<I>(
    grammar: AbstractParsedGrammarDefinition<I & HierarchicalInfo>,
    [noun, ...restPath]: HierarchicalPath
): {
    walk: (steps?: number) => boolean
    get: () => AbstractParsedSteps<I & HierarchicalInfo>
    set: (value: AbstractParsedSteps<I>) => void
    getNextIndex: () => number
    getPath: () => HierarchicalPath
} {
    let nextRestPathIndex = 0
    let setter = (value: AbstractParsedSteps<I>) => {
        grammar[noun] = toHierarchicalSteps(value, noun)
    }
    let current: AbstractParsedSteps<I & HierarchicalInfo> = grammar[noun]
    const walk = (stepsAmount: number = restPath.length - nextRestPathIndex) => {
        const stepsToWalk = stepsAmount < 0 ? restPath.length - nextRestPathIndex + stepsAmount : stepsAmount - 1
        if (stepsToWalk < 0) {
            throw new Error(`unable to walk negative amount of steps (${stepsToWalk} steps)`)
        }
        if (stepsToWalk === 0) {
            return true
        }
        for (let i = 0; i < stepsToWalk - 1; i++) {
            if (current.children == null) {
                return false
            }
            const index = restPath[nextRestPathIndex]
            current = current.children[index]
            ++nextRestPathIndex
        }
        if (current.children == null) {
            return false
        }
        const previous = current
        const index = restPath[nextRestPathIndex]
        ++nextRestPathIndex
        setter = (value) =>
            (previous.children[index] = toHierarchicalSteps(value, noun, ...restPath.slice(0, nextRestPathIndex)))
        current = current.children[index]
        return true
    }
    return {
        walk,
        get: () => current,
        set: (value) => setter(value),
        getNextIndex: () => restPath[nextRestPathIndex],
        getPath: () => [noun, ...restPath.slice(0, nextRestPathIndex)],
    }
}

export function getAtPath<I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    path: HierarchicalPath
): AbstractParsedSteps<I> | undefined {
    const walker = createPathWalker(grammar, path)
    const successfull = walker.walk(-1)
    if (!successfull) {
        return undefined
    }
    return walker.get()
}

export function setAtPath<I>(
    grammar: AbstractParsedGrammarDefinition<I & HierarchicalInfo>,
    path: HierarchicalPath,
    set: AbstractParsedSteps<I>
): boolean {
    const walker = createPathWalker(grammar, path)
    const successfull = walker.walk()
    if (!successfull) {
        return false
    }
    walker.set(set)
    return true
}

export function toHierarchicalSteps(steps: ParsedSteps, ...basePath: HierarchicalPath): HierarchicalParsedSteps {
    return {
        ...steps,
        path: basePath,
        children: steps.children?.map((child, i) => toHierarchicalSteps(child, ...basePath, i)) as any,
    }
}

export function toHierachical(grammar: ParsedGrammarDefinition) {
    return Object.entries(grammar).reduce<HierarchicalParsedGrammarDefinition>(
        (prev, [name, steps]) => ({ ...prev, [name]: toHierarchicalSteps(steps, name) }),
        {}
    )
}
