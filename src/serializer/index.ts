import { ParsedGrammarDefinition, ParsedSteps } from ".."
import { serializeSteps } from "./serialize"

export function serializeString(grammarDefinition: ParsedGrammarDefinition): string {
    return Object.entries(grammarDefinition)
        .map(([symbol, step]) => `${symbol} -> ${serializeStepString(step)}`)
        .join("\n")
}

export function serializeStepString(steps: ParsedSteps): string {
    return serializeSteps(steps, serializeStepString, (...values) => values.join(""))
}

export * from "./serialize"
