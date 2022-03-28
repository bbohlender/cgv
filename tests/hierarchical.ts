import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, ParsedSteps } from "../src"

export function validateHierarchical(grammar: HierarchicalParsedGrammarDefinition): void {
    for (const [name, step] of Object.entries(grammar)) {
        validateHierarchicalSteps(step, name)
    }
}

export function validateHierarchicalSteps(
    step: HierarchicalParsedSteps,
    parent: ParsedSteps | string,
    childrenIndex?: number,
    position = "root"
): void {
    if (step.parent != parent) {
        throw new Error(`parent reference not equal to actual parent at ${position}`)
    }
    if (step.childrenIndex != childrenIndex) {
        throw new Error(`childrenIndex not equal to actual position in parent at ${position}`)
    }
    if (step.children == null) {
        return
    }
    for (let i = 0; i < step.children.length; i++) {
        const child = step.children[i]
        validateHierarchicalSteps(child, step, i, `${position} -> #${i} ${child.type}`)
    }
}
