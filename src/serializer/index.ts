import {
    ParsedBracket,
    ParsedGrammarDefinition,
    ParsedOperation,
    ParsedParallel,
    ParsedRaw,
    ParsedSequantial,
    ParsedSteps,
    ParsedSymbol,
    ParsedThis,
} from ".."

export function serialize(grammarDefinition: ParsedGrammarDefinition): string {
    return Object.entries(grammarDefinition)
        .map(([symbol, step]) => `${symbol} -> ${serializeStep(step)}`)
        .join("\n\n")
}

function serializeStep(step: ParsedSteps): string {
    switch (step.type) {
        case "operation":
            return serializeOperation(step)
        case "parallel":
            return serializeParallel(step)
        case "raw":
            return serializeRaw(step)
        case "sequential":
            return serializeSequential(step)
        case "symbol":
            return serializeSymbol(step)
        case "this":
            return serializeThis(step)
        case "bracket":
            return serializeBracket(step)
    }
}

function serializeBracket(step: ParsedBracket): string {
    return `(${serializeStep(step.steps)})`
}

function serializeOperation(operationStep: ParsedOperation): string {
    switch (operationStep.identifier) {
        case "if":
            return serializeIf(operationStep.parameters)
        case "switch":
            return serializeSwitch(operationStep.parameters)
        case "return":
            return "return"
        case "getVariable":
            return `this.${serializeStep(operationStep.parameters[0])}`
        case "setVariable":
            return `this.${serializeStep(operationStep.parameters[0])} = ${serializeStep(operationStep.parameters[1])}`
        case "+":
        case "-":
        case "/":
        case "*":
        case "%":
        case "&&":
        case "||":
        case "<":
        case "<=":
        case ">":
        case ">=":
        case "==":
        case "!=":
            return `${serializeStep(operationStep.parameters[0])} ${operationStep.identifier} ${serializeStep(
                operationStep.parameters[1]
            )}`
        case "!-":
        case "!":
            return `${operationStep.identifier}${serializeStep(operationStep.parameters[0])}`
        default:
            return `${operationStep.identifier}(${operationStep.parameters
                .map((parameter) => serializeStep(parameter))
                .join(", ")})`
    }
}

function serializeIf(steps: Array<ParsedSteps>): string {
    return `if ${serializeStep(steps[0])} then ${serializeStep(steps[1])} else ${serializeStep(steps[2])}`
}

function serializeSwitch(steps: Array<ParsedSteps>): string {
    return `switch ${serializeStep(steps[0])} ${serializeCatches(steps.slice(1))}`
}

function serializeCatches(steps: Array<ParsedSteps>): string {
    const result = ""
    for (let i = 0; i < Math.floor(steps.length / 2); i++) {
        const compare = steps[i * 2]
        const value = steps[i * 2 + 1]
        return `case ${serializeStep(compare)}: ${serializeStep(value)}`
    }
    return result
}

function serializeParallel(parallelStep: ParsedParallel): string {
    return parallelStep.stepsList.map(serializeStep).join(" | ")
}

function serializeRaw(rawStep: ParsedRaw): string {
    const value = rawStep.value
    switch (typeof value) {
        case "number":
        case "string":
        case "boolean":
            return value.toString()
        default:
            throw new Error(`value of unknown type `)
    }
}

function serializeSequential(sequentialStep: ParsedSequantial): string {
    return sequentialStep.stepsList.map(serializeStep).join(" ")
}

function serializeSymbol(symbolStep: ParsedSymbol): string {
    return symbolStep.identifier
}

function serializeThis(thisStep: ParsedThis): string {
    return "this"
}
