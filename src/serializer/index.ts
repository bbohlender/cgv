import {
    ParsedBinaryOperator,
    ParsedBracket,
    ParsedGetVariable,
    ParsedGrammarDefinition,
    ParsedIf,
    ParsedOperation,
    ParsedParallel,
    ParsedRandom,
    ParsedRaw,
    ParsedReturn,
    ParsedSequantial,
    ParsedSetVariable,
    ParsedSteps,
    ParsedSwitch,
    ParsedSymbol,
    ParsedThis,
    ParsedUnaryOperator,
} from ".."

export function serialize(grammarDefinition: ParsedGrammarDefinition): string {
    return Object.entries(grammarDefinition)
        .map(([symbol, step]) => `${symbol} -> ${serializeStep(step)}`)
        .join("\n")
}

export function serializeStep(step: ParsedSteps): string {
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
        case "invert":
        case "not":
            return serializeUnaryOperator(step)
        case "add":
        case "and":
        case "divide":
        case "equal":
        case "greater":
        case "greaterEqual":
        case "modulo":
        case "multiply":
        case "or":
        case "smaller":
        case "smallerEqual":
        case "subtract":
        case "unequal":
            return serializeBinaryOperator(step)
        case "if":
            return serializeIf(step)
        case "switch":
            return serializeSwitch(step)
        case "getVariable":
            return serializeGetVariable(step)
        case "setVariable":
            return serializeSetVariable(step)
        case "return":
            return serializeReturn(step)
        case "random":
            return serializeRandom(step)
    }
}

function serializeRandom(step: ParsedRandom): string {
    if (step.children.length != step.probabilities.length) {
        throw new Error(`random step must have the same amount of childrens as the amount of probabilities`)
    }
    return `{ ${step.children
        .map((child, i) => `${toFixedMax(step.probabilities[i] * 100, 2)}%: ${serializeStep(child)}`)
        .join(" ")} }`
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function serializeBracket(step: ParsedBracket): string {
    return `(${serializeStep(step.children[0])})`
}

function serializeUnaryOperator(unaryOperatorStep: ParsedUnaryOperator): string {
    const op1 = serializeStep(unaryOperatorStep.children[0])
    switch (unaryOperatorStep.type) {
        case "invert":
            return `-${op1}`
        case "not":
            return `!${op1}`
    }
}

function serializeBinaryOperator(binaryOperatorStep: ParsedBinaryOperator): string {
    const op1 = serializeStep(binaryOperatorStep.children[0])
    const op2 = serializeStep(binaryOperatorStep.children[1])

    switch (binaryOperatorStep.type) {
        case "add":
            return `${op1} + ${op2}`
        case "and":
            return `${op1} && ${op2}`
        case "divide":
            return `${op1} / ${op2}`
        case "equal":
            return `${op1} == ${op2}`
        case "greater":
            return `${op1} > ${op2}`
        case "greaterEqual":
            return `${op1} >= ${op2}`
        case "modulo":
            return `${op1} % ${op2}`
        case "multiply":
            return `${op1} * ${op2}`
        case "or":
            return `${op1} || ${op2}`
        case "smaller":
            return `${op1} < ${op2}`
        case "smallerEqual":
            return `${op1} <= ${op2}`
        case "subtract":
            return `${op1} - ${op2}`
        case "unequal":
            return `${op1} != ${op2}`
    }
}

function serializeReturn(returnStep: ParsedReturn): string {
    return "return"
}

function serializeGetVariable(getVariableStep: ParsedGetVariable): string {
    return `this.${serializeStep(getVariableStep.children[0])}`
}

function serializeSetVariable(setVariableStep: ParsedSetVariable): string {
    return `this.${serializeStep(setVariableStep.children[0])} = ${serializeStep(setVariableStep.children[1])}`
}

function serializeOperation(operationStep: ParsedOperation): string {
    return `${operationStep.identifier}(${operationStep.children
        .map((parameter) => serializeStep(parameter))
        .join(", ")})`
}

function serializeIf(step: ParsedIf): string {
    return `if ${serializeStep(step.children[0])} then ${serializeStep(step.children[1])} else ${serializeStep(
        step.children[2]
    )}`
}

function serializeSwitch(step: ParsedSwitch): string {
    return `switch ${serializeStep(step.children[0])} ${serializeCatches(step.children.slice(1))}`
}

function serializeCatches(steps: Array<ParsedSteps>): string {
    const results: Array<string> = []
    for (let i = 0; i < Math.floor(steps.length / 2); i++) {
        const compare = steps[i * 2]
        const value = steps[i * 2 + 1]
        results.push(`case ${serializeStep(compare)}: ${serializeStep(value)}`)
    }
    return results.join(" ")
}

function serializeParallel(parallelStep: ParsedParallel): string {
    return parallelStep.children.map(serializeStep).join(" | ")
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
    return sequentialStep.children.map(serializeStep).join(" ")
}

function serializeSymbol(symbolStep: ParsedSymbol): string {
    return symbolStep.identifier
}

function serializeThis(thisStep: ParsedThis): string {
    return "this"
}
