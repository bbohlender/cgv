import { ParsedGrammarDefinition, ParsedSteps } from ".."

export function replaceSymbolsGrammar(definition: ParsedGrammarDefinition): [string, ParsedSteps] {
    const rules = Object.entries(definition)
    if (rules.length === 0) {
        return ["unknown", { type: "this" }]
    }
    const [ruleName, steps] = rules[0]
    return [ruleName, replaceSymbolsSteps(steps, definition)]
}

export function replaceSymbolsSteps(
    steps: ParsedSteps,
    definition: ParsedGrammarDefinition,
    visited: Set<string> = new Set()
): ParsedSteps {
    if (steps.type === "symbol") {
        if (visited.has(steps.identifier)) {
            throw new Error(`the summarizer does not yet support recursion`)
        }
        const rule = definition[steps.identifier]
        if (rule == null) {
            throw new Error(`unknown rule "${steps.identifier}"`)
        }
        return {
            type: "bracket",
            children: [replaceSymbolsSteps(rule, definition, new Set([...visited, steps.identifier]))],
        }
    } else {
        return {
            ...steps,
            children: steps.children?.map((child) => replaceSymbolsSteps(child, definition, visited)) as any,
        }
    }
}
