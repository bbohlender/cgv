import { ParsedDescription, ParsedTransformation } from ".."
import { createSerializer, serialize, Serializer, serializeSteps } from "./serialize"

function singleLineWhitespace(indentation: number, ...steps: (ParsedTransformation | string)[]): string {
    if (typeof steps[0] === "string") {
        return "\n"
    }
    return " "
}

export function multilineStringWhitespace(indentation: number, ...steps: (ParsedTransformation | string)[]): string {
    for (const step of steps) {
        if (typeof step === "string") {
            return "\n\n"
        }
        if (descendantCount(step) > 2) {
            return `\n${"\t".repeat(indentation)}`
        }
    }
    return " "
}

export function descendantCount(step: ParsedTransformation): number {
    return step.children?.reduce((prev, child) => prev + descendantCount(child) + 1, 0) ?? 0
}

function createStringSerializer(
    customSerialize: (step: ParsedTransformation | string) => string | undefined = () => undefined,
    getWhitespace: (identation: number, ...steps: (ParsedTransformation | string)[]) => string = singleLineWhitespace
) {
    const serializer: Serializer<string> = createSerializer(
        (text) => text,
        (indentation, step) =>
            customSerialize(step) ?? (typeof step === "string" ? step : serializeSteps(step, serializer, indentation)),
        (...values) => values.join(""),
        getWhitespace
    )
    return serializer
}

export function serializeString(
    grammarDefinition: ParsedDescription,
    customSerialize: (step: ParsedTransformation | string) => string | undefined = () => undefined,
    getWhitespace: (identation: number, ...steps: (ParsedTransformation | string)[]) => string = singleLineWhitespace
): string {
    const serializer = createStringSerializer(customSerialize, getWhitespace)
    return serialize(grammarDefinition, serializer)
}

export function serializeStepString(
    step: ParsedTransformation,
    indentation = 0,
    customSerialize: (step: ParsedTransformation | string) => string | undefined = () => undefined,
    getWhitespace: (identation: number, ...steps: (ParsedTransformation | string)[]) => string = singleLineWhitespace
): string {
    const serializer = createStringSerializer(customSerialize, getWhitespace)
    return serializer.fromStep(indentation, undefined, step)
}

export * from "./serialize"
