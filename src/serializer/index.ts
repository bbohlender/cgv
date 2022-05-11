import { ParsedGrammarDefinition, ParsedSteps } from ".."
import { serializeSteps } from "./serialize"

export function serializeString(
    grammarDefinition: ParsedGrammarDefinition,
    customSerialize: (step: ParsedSteps | string) => string | undefined = () => undefined
): string {
    return grammarDefinition
        .map(({ name, step }) => `${customSerialize(name) ?? name} --> ${serializeStepString(step, customSerialize)}`)
        .join("\n\n")
}

export function serializeStepString(
    steps: ParsedSteps,
    customSerialize: (step: ParsedSteps | string) => string | undefined = () => undefined
): string {
    return serializeSteps(
        steps,
        (text) => text,
        (step) => customSerialize(step) ?? serializeStepString(step, customSerialize),
        (...values) => values.join("")
    )
}

export * from "./serialize"
