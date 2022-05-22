import {
    AbstractParsedSteps,
    ParsedBinaryOperator,
    ParsedGetVariable,
    ParsedIf,
    ParsedNull,
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
import { requiresBracket } from "../util"

/**
 * @returns a array of strings that represents the text that fits between the children (text[0], children[0], text[1], children[1], text[2]) - the result start with a text and ends with a text and thus the length of text is equal to the amount of children plus 1
 */
export function serializeSteps<T, K>(
    steps: AbstractParsedSteps<K>,
    serializeText: (text: string) => T,
    serializeChild: (child: AbstractParsedSteps<K>) => T,
    join: (...values: Array<T>) => T
): T {
    const wrappedSerializeChild = (child: ParsedSteps) =>
        serializeChildWithBrackets(steps, serializeText, serializeChild, join, child)
    switch (steps.type) {
        case "operation":
            return serializeOperation(steps, serializeText, wrappedSerializeChild, join)
        case "parallel":
            return serializeParallel(steps, serializeText, wrappedSerializeChild, join)
        case "raw":
            return serializeRaw(steps, serializeText, wrappedSerializeChild, join)
        case "sequential":
            return serializeSequentialAbstract(steps, serializeText, wrappedSerializeChild, join)
        case "symbol":
            return serializeSymbolAbstract(steps, serializeText, wrappedSerializeChild, join)
        case "this":
            return serializeThisAbstract(steps, serializeText, wrappedSerializeChild, join)
        case "invert":
        case "not":
            return serializeUnaryOperator(steps, serializeText, wrappedSerializeChild, join)
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
            return serializeBinaryOperator(steps, serializeText, wrappedSerializeChild, join)
        case "if":
            return serializeIf(steps, serializeText, wrappedSerializeChild, join)
        case "switch":
            return serializeSwitch(steps, serializeText, wrappedSerializeChild, join)
        case "getVariable":
            return serializeGetVariable(steps, serializeText, wrappedSerializeChild, join)
        case "setVariable":
            return serializeSetVariable(steps, serializeText, wrappedSerializeChild, join)
        case "return":
            return serializeReturn(steps, serializeText, wrappedSerializeChild, join)
        case "random":
            return serializeRandom(steps, serializeText, wrappedSerializeChild, join)
        case "null":
            return serializeNull(steps, serializeText, wrappedSerializeChild, join)
    }
}

function serializeChildWithBrackets<T>(
    parent: ParsedSteps,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T,
    child: ParsedSteps
): T {
    const serializedChild = serializeChild(child)
    if (requiresBracket(parent, child)) {
        return join(serializeText("("), serializedChild, serializeText(")"))
    }
    return serializedChild
}

function serializeRandom<T>(
    step: ParsedRandom,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    if (step.children.length != step.probabilities.length) {
        throw new Error(`random step must have the same amount of childrens as the amount of probabilities`)
    }
    return join(
        serializeText("{ "),
        ...insertBetweenAll(
            step.children.map((child, i) => [
                serializeText(`${toFixedMax(step.probabilities[i] * 100, 2)}%: `),
                serializeChild(child),
            ]),
            serializeText(" ")
        ).reduce<Array<T>>((v1, v2) => v1.concat(v2), []),
        serializeText(" }")
    )
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function serializeUnaryOperator<T>(
    unaryOperatorStep: ParsedUnaryOperator,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    switch (unaryOperatorStep.type) {
        case "invert":
            return join(serializeText(`-`), serializeChild(unaryOperatorStep.children[0]))
        case "not":
            return join(serializeText(`!`), serializeChild(unaryOperatorStep.children[0]))
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
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(
        serializeChild(binaryOperatorStep.children[0]),
        serializeText(` ${binarOperatorMap[binaryOperatorStep.type]} `),
        serializeChild(binaryOperatorStep.children[1])
    )
}

function serializeReturn<T>(
    returnStep: ParsedReturn,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText("return")
}

function serializeNull<T>(
    nullStep: ParsedNull,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText("null")
}

function serializeGetVariable<T>(
    getVariableStep: ParsedGetVariable,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText(`this.${getVariableStep.identifier}`)
}

function serializeSetVariable<T>(
    setVariableStep: ParsedSetVariable,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(serializeText(`this.${setVariableStep.identifier} = `), serializeChild(setVariableStep.children[0]))
}

function serializeOperation<T>(
    operationStep: ParsedOperation,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(
        serializeText(`${operationStep.identifier}(`),
        ...insertBetweenAll(operationStep.children.map(serializeChild), serializeText(", ")),
        serializeText(")")
    )
}

function serializeIf<T>(
    step: ParsedIf,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(
        serializeText(`if `),
        serializeChild(step.children[0]),
        serializeText(` then { `),
        serializeChild(step.children[1]),
        serializeText(` } else { `),
        serializeChild(step.children[2]),
        serializeText(` }`)
    )
}

function serializeSwitch<T>(
    step: ParsedSwitch,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(
        serializeText("switch "),
        serializeChild(step.children[0]),
        serializeText(" { "),
        ...insertBetweenAll(
            step.cases.map((caseValues, i) => [
                ...caseValues.map((caseValue) => serializeText(`case ${serializeConstant(caseValue)}: `)),
                serializeChild(step.children[i + 1]),
            ]),
            serializeText(" ")
        ).reduce<Array<T>>((v1, v2) => v1.concat(v2), []),
        serializeText(" }")
    )
}

function serializeParallel<T>(
    parallelStep: ParsedParallel,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(...insertBetweenAll(parallelStep.children.map(serializeChild), serializeText(" | ")))
}

function serializeRaw<T>(
    rawStep: ParsedRaw,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText(serializeConstant(rawStep.value))
}

function serializeConstant(constant: string | number | boolean): string {
    switch (typeof constant) {
        case "string":
            return `"${constant}"`
        case "number":
            return `${Math.round(constant * 100) / 100}`
        case "boolean":
            return constant.toString()
        default:
            throw new Error(`constant "${constant}" of unexpected type`)
    }
}

function serializeSequentialAbstract<T>(
    sequentialStep: ParsedSequantial,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return join(...insertBetweenAll(sequentialStep.children.map(serializeChild), serializeText(" -> ")))
}

function serializeSymbolAbstract<T>(
    symbolStep: ParsedSymbol,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText(symbolStep.identifier)
}

function serializeThisAbstract<T>(
    thisStep: ParsedThis,
    serializeText: (text: string) => T,
    serializeChild: (child: ParsedSteps) => T,
    join: (...values: Array<T>) => T
): T {
    return serializeText("this")
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
