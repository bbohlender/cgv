import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps, HierarchicalPath, shallowEqual } from "../src"

export function validateHierarchical(grammar: HierarchicalParsedGrammarDefinition): void {
    for (const { name, step } of grammar) {
        validateHierarchicalSteps(step, name)
    }
}

export function validateHierarchicalSteps(step: HierarchicalParsedSteps, ...path: HierarchicalPath): void {
    if (!shallowEqual(step.path, path)) {
        throw new Error(`path at "${path.join(" -> ")}" is wrong. Found: "${step.path.join(" -> ")}"`)
    }
    if (step.children == null) {
        return
    }
    for (let i = 0; i < step.children.length; i++) {
        const child = step.children[i]
        validateHierarchicalSteps(child, ...step.path, i)
    }
}
