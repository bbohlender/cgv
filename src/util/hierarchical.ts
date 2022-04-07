import { AbstractParsedGrammarDefinition, AbstractParsedSteps } from ".."
import { ParsedGrammarDefinition, ParsedSteps } from "../parser"

export type HierarchicalPath = [string, ...Array<number>]
export type HierarchicalInfo = { path: HierarchicalPath }
export type HierarchicalParsedSteps = AbstractParsedSteps<HierarchicalInfo>
export type HierarchicalParsedGrammarDefinition = AbstractParsedGrammarDefinition<HierarchicalInfo>

export function getAtPath<I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    [noun, ...path]: HierarchicalPath
): AbstractParsedSteps<I> | undefined {
    let current = grammar[noun]
    for (const index of path) {
        if (current.children == null) {
            return undefined
        }
        current = current.children[index]
    }
    return current
}

export function setAtPath<I>(
    grammar: AbstractParsedGrammarDefinition<I>,
    path: HierarchicalPath,
    set: AbstractParsedSteps<I>
): boolean {
    const [noun, ...indices] = path
    if (indices.length === 0) {
        grammar[noun] = set
        return true
    }
    const entry = getAtPath(grammar, path.slice(-1) as HierarchicalPath)
    if (entry == null || entry.children == null) {
        return false
    }
    entry.children[indices[indices.length - 1]] = set
    return true
}

export function toHierarchicalSteps(steps: ParsedSteps, ...basePath: HierarchicalPath): HierarchicalParsedSteps {
    return {
        ...steps,
        path: basePath,
        children: steps.children?.map((child, i) => toHierarchicalSteps(child, ...basePath, i)) as any,
    }
}
