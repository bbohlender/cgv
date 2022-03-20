import { serializeStepString } from "."
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
} from "../parser"

/**
 * @returns a array of strings that represents the text that fits between the children (text[0], children[0], text[1], children[1], text[2]) - the result start with a text and ends with a text and thus the length of text is equal to the amount of children plus 1
 */
export function serializeSteps<T>(
    steps: ParsedSteps,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    switch (steps.type) {
        case "operation":
            return serializeOperation(steps, serializeChild, join)
        case "parallel":
            return serializeParallel(steps, serializeChild, join)
        case "raw":
            return serializeRaw(steps, serializeChild, join)
        case "sequential":
            return serializeSequentialAbstract(steps, serializeChild, join)
        case "symbol":
            return serializeSymbolAbstract(steps, serializeChild, join)
        case "this":
            return serializeThisAbstract(steps, serializeChild, join)
        case "bracket":
            return serializeBracket(steps, serializeChild, join)
        case "invert":
        case "not":
            return serializeUnaryOperator(steps, serializeChild, join)
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
            return serializeBinaryOperator(steps, serializeChild, join)
        case "if":
            return serializeIf(steps, serializeChild, join)
        case "switch":
            return serializeSwitch(steps, serializeChild, join)
        case "getVariable":
            return serializeGetVariable(steps, serializeChild, join)
        case "setVariable":
            return serializeSetVariable(steps, serializeChild, join)
        case "return":
            return serializeReturn(steps, serializeChild, join)
        case "random":
            return serializeRandom(steps, serializeChild, join)
    }
}

function serializeRandom<T>(
    step: ParsedRandom,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    if (step.children.length != step.probabilities.length) {
        throw new Error(`random step must have the same amount of childrens as the amount of probabilities`)
    }
    return join(
        "{ ",
        ...insertBetweenAll(
            step.children.map((child, i) => [
                `${toFixedMax(step.probabilities[i] * 100, 2)}%: `,
                serializeChild(child, i),
            ]),
            " "
        ).reduce<Array<T | string>>((v1, v2) => v1.concat(v2), []),
        " }"
    )
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function serializeBracket<T>(
    step: ParsedBracket,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(`(`, serializeChild(step.children[0], 0), `)`)
}

function serializeUnaryOperator<T>(
    unaryOperatorStep: ParsedUnaryOperator,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    switch (unaryOperatorStep.type) {
        case "invert":
            return join(`-`, serializeChild(unaryOperatorStep.children[0], 0))
        case "not":
            return join(`!`, serializeChild(unaryOperatorStep.children[0], 0))
    }
}

const binarOperatorMap: { [Key in ParsedBinaryOperator["type"]]: string } = {
    add: "+",
    and: "&&",
    divide: "/",
    equal: "==",
    greater: ">",
    greaterEqual: ">=",
    modulo: "%",
    multiply: "*",
    or: "||",
    smaller: "<",
    smallerEqual: "<=",
    subtract: "-",
    unequal: "!=",
}

function serializeBinaryOperator<T>(
    binaryOperatorStep: ParsedBinaryOperator,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(
        serializeChild(binaryOperatorStep.children[0], 0),
        ` ${binarOperatorMap[binaryOperatorStep.type]} `,
        serializeChild(binaryOperatorStep.children[1], 1)
    )
}

function serializeReturn<T>(
    returnStep: ParsedReturn,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join("return")
}

function serializeGetVariable<T>(
    getVariableStep: ParsedGetVariable,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(`this.${getVariableStep.identifier}`)
}

function serializeSetVariable<T>(
    setVariableStep: ParsedSetVariable,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(`this.${setVariableStep.identifier} = `, serializeChild(setVariableStep.children[0], 0))
}

function serializeOperation<T>(
    operationStep: ParsedOperation,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(
        operationStep.identifier,
        "(",
        ...insertBetweenAll(operationStep.children.map(serializeChild), ", "),
        ")"
    )
}

function serializeIf<T>(
    step: ParsedIf,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(
        `if `,
        serializeChild(step.children[0], 0),
        ` then `,
        serializeChild(step.children[1], 1),
        ` else `,
        serializeChild(step.children[2], 2)
    )
}

function serializeSwitch<T>(
    step: ParsedSwitch,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(
        "switch ",
        serializeChild(step.children[0], 0),
        " ",
        ...insertBetweenAll(
            step.cases.map((caseValue, i) => [
                `case ${serializeConstant(caseValue)}: `,
                serializeChild(step.children[i + 1], i + 1),
            ]),
            " "
        ).reduce<Array<T | string>>((v1, v2) => v1.concat(v2), [])
    )
}

function serializeParallel<T>(
    parallelStep: ParsedParallel,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(...insertBetweenAll(parallelStep.children.map(serializeChild), " | "))
}

function serializeRaw<T>(
    rawStep: ParsedRaw,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(serializeConstant(rawStep.value))
}

function serializeConstant(constant: string | number | boolean): string {
    const type = typeof constant
    switch (type) {
        case "string":
            return `"${constant}"`
        case "number":
        case "boolean":
            return constant.toString()
        default:
            throw new Error(`constant "${constant}" of unknown type "${type}"`)
    }
}

function serializeSequentialAbstract<T>(
    sequentialStep: ParsedSequantial,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(...insertBetweenAll(sequentialStep.children.map(serializeChild), " "))
}

function serializeSymbolAbstract<T>(
    symbolStep: ParsedSymbol,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join(symbolStep.identifier)
}

function serializeThisAbstract<T>(
    thisStep: ParsedThis,
    serializeChild: (child: ParsedSteps, index: number) => T,
    join: (...values: Array<T | string>) => T
): T {
    return join("this")
}

function insertBetweenAll<T, K>(array: Array<T>, insert: K): Array<K | T> {
    const result: Array<K | T> = []
    for (let i = 0; i < array.length; i++) {
        result.push(array[i])
        if (i < array.length - 1) {
            result.push(insert)
        }
    }
    return result
}
