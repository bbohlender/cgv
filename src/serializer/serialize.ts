import {
    AbstractParsedGrammarDefinition,
    AbstractParsedNoun,
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

export function createSerializer<T, K>(
    fromText: (text: string, forStep: AbstractParsedSteps<K> | string) => T,
    fromStep: (indentation: number, child: AbstractParsedSteps<K> | string) => T,
    join: (...values: Array<T>) => T,
    getWhitespace: (identation: number, ...steps: (ParsedSteps | string)[]) => T
): Serializer<T, K> {
    const serializer: Serializer<T, K> = {
        fromStep: (indentation: number, parent: AbstractParsedSteps<K> | undefined, child: ParsedSteps | string) =>
            serializeChildWithBrackets(parent, child, serializer, fromStep, indentation),
        fromText,
        getWhitespace,
        join,
    }
    return serializer
}

export function serialize<T, K>(
    grammarDefinition: AbstractParsedGrammarDefinition<K>,
    serializer: Serializer<T, K>
): T {
    return serializer.join(
        ...grammarDefinition.map(({ name, step }, i) => {
            const nounName = serializer.fromStep(0, undefined, name)
            const arrow = serializer.fromText(` -->`, name)
            const stepWhitespace = serializer.getWhitespace(1, step)
            const stepSerialized = serializer.fromStep(1, undefined, step)
            return i === 0
                ? serializer.join(nounName, arrow, stepWhitespace, stepSerialized)
                : serializer.join(serializer.getWhitespace(0, name), nounName, arrow, stepWhitespace, stepSerialized)
        })
    )
}

/**
 * @returns a array of strings that represents the text that fits between the children (text[0], children[0], text[1], children[1], text[2]) - the result start with a text and ends with a text and thus the length of text is equal to the amount of children plus 1
 */
export function serializeSteps<T, K>(steps: AbstractParsedSteps<K>, serializer: Serializer<T, K>, indentation = 0): T {
    switch (steps.type) {
        case "operation":
            return serializeOperation(steps, serializer, indentation)
        case "parallel":
            return serializeParallel(steps, serializer, indentation)
        case "raw":
            return serializeRaw(steps, serializer, indentation)
        case "sequential":
            return serializeSequentialAbstract(steps, serializer, indentation)
        case "symbol":
            return serializeSymbolAbstract(steps, serializer, indentation)
        case "this":
            return serializeThisAbstract(steps, serializer, indentation)
        case "invert":
        case "not":
            return serializeUnaryOperator(steps, serializer, indentation)
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
            return serializeBinaryOperator(steps, serializer, indentation)
        case "if":
            return serializeIf(steps, serializer, indentation)
        case "switch":
            return serializeSwitch(steps, serializer, indentation)
        case "getVariable":
            return serializeGetVariable(steps, serializer, indentation)
        case "setVariable":
            return serializeSetVariable(steps, serializer, indentation)
        case "return":
            return serializeReturn(steps, serializer, indentation)
        case "random":
            return serializeRandom(steps, serializer, indentation)
        case "null":
            return serializeNull(steps, serializer, indentation)
    }
}

export type Serializer<T, K = unknown> = {
    fromText: (text: string, forStep: AbstractParsedSteps<K> | string) => T
    fromStep: (
        identation: number,
        parent: AbstractParsedSteps<K> | undefined,
        step: AbstractParsedSteps<K> | string
    ) => T
    join: (...values: Array<T>) => T
    getWhitespace: (identation: number, ...steps: Array<AbstractParsedSteps<K> | string>) => T
}

function serializeChildWithBrackets<T>(
    parent: ParsedSteps | undefined,
    child: ParsedSteps | string,
    serializer: Serializer<T>,
    fromStep: (indentation: number, child: AbstractParsedSteps<unknown> | string) => T,
    indentation: number
): T {
    if (parent != null && typeof child != "string" && requiresBracket(parent, child)) {
        return serializer.join(
            serializer.fromText("(", child),
            serializer.getWhitespace(indentation + 1, child),
            fromStep(indentation + 1, child),
            serializer.getWhitespace(indentation, child),
            serializer.fromText(")", child)
        )
    }
    return fromStep(indentation, child)
}

function serializeRandom<T>(step: ParsedRandom, serializer: Serializer<T>, indentation: number): T {
    if (step.children.length != step.probabilities.length) {
        throw new Error(`random step must have the same amount of childrens as the amount of probabilities`)
    }
    const whitespace = serializer.getWhitespace(indentation, step)
    const innerWhitespace = serializer.getWhitespace(indentation + 1, step)
    return serializer.join(
        serializer.fromText("{", step),
        ...step.children
            .map((child, i) => [
                innerWhitespace,
                serializer.fromText(`${toFixedMax(step.probabilities[i] * 100, 2)}%:`, step),
                innerWhitespace,
                serializer.fromStep(indentation + 1, step, child),
            ])
            .reduce<Array<T>>((v1, v2) => v1.concat(v2), []),

        whitespace,
        serializer.fromText("}", step)
    )
}

function toFixedMax(value: number, max: number): string {
    const multiplier = Math.pow(10, max)
    return (Math.round(value * multiplier) / multiplier).toString()
}

function serializeUnaryOperator<T>(step: ParsedUnaryOperator, serializer: Serializer<T>, indentation: number): T {
    switch (step.type) {
        case "invert":
            return serializer.join(
                serializer.fromText(`-`, step),
                serializer.fromStep(indentation, step, step.children[0])
            )
        case "not":
            return serializer.join(
                serializer.fromText(`!`, step),
                serializer.fromStep(indentation, step, step.children[0])
            )
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

function serializeBinaryOperator<T>(step: ParsedBinaryOperator, serializer: Serializer<T>, indentation: number): T {
    return serializer.join(
        serializer.fromStep(indentation, step, step.children[0]),
        serializer.fromText(` ${binarOperatorMap[step.type]} `, step),
        serializer.fromStep(indentation, step, step.children[1])
    )
}

function serializeReturn<T>(step: ParsedReturn, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText("return", step)
}

function serializeNull<T>(step: ParsedNull, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText("null", step)
}

function serializeGetVariable<T>(step: ParsedGetVariable, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText(`this.${step.identifier}`, step)
}

function serializeSetVariable<T>(step: ParsedSetVariable, serializer: Serializer<T>, indentation: number): T {
    return serializer.join(
        serializer.fromText(`this.${step.identifier} =`, step),
        serializer.getWhitespace(indentation + 1, step.children[0]),
        serializer.fromStep(indentation + 1, step, step.children[0])
    )
}

function serializeOperation<T>(step: ParsedOperation, serializer: Serializer<T>, indentation: number): T {
    const outerWhitespace = serializer.getWhitespace(indentation, step)
    const innerWhitespace = serializer.getWhitespace(indentation + 1, step)
    return serializer.join(
        serializer.fromText(`${step.identifier}(`, step),
        ...insertBetweenAll(
            step.children.map((child) =>
                serializer.join(innerWhitespace, serializer.fromStep(indentation + 1, step, child))
            ),
            serializer.fromText(",", step)
        ),
        outerWhitespace,
        serializer.fromText(")", step)
    )
}

function serializeIf<T>(step: ParsedIf, serializer: Serializer<T>, indentation: number): T {
    const [conditionStep, ifStep, elseStep] = step.children
    const conditionBeforeWhitespace = serializer.getWhitespace(indentation + 1, conditionStep)
    const conditionAfterWhitespace = serializer.getWhitespace(indentation, conditionStep)
    const ifElseBeforeWhitespace = serializer.getWhitespace(indentation + 1, ifStep, elseStep)
    const ifElseAfterWhitespace = serializer.getWhitespace(indentation, ifStep, elseStep)
    return serializer.join(
        serializer.fromText(`if`, step),
        conditionBeforeWhitespace,
        serializer.fromStep(indentation + 1, step, conditionStep),
        conditionAfterWhitespace,
        serializer.fromText(`then {`, step),
        ifElseBeforeWhitespace,
        serializer.fromStep(indentation + 1, step, ifStep),
        ifElseAfterWhitespace,
        serializer.fromText(`} else {`, step),
        ifElseBeforeWhitespace,
        serializer.fromStep(indentation + 1, step, elseStep),
        ifElseAfterWhitespace,
        serializer.fromText(`}`, step)
    )
}

function serializeSwitch<T>(step: ParsedSwitch, serializer: Serializer<T>, indentation: number): T {
    const whitespace = serializer.getWhitespace(indentation, step)
    const caseWhitespace = serializer.getWhitespace(indentation + 1, step)
    return serializer.join(
        serializer.fromText("switch", step),
        serializer.getWhitespace(indentation + 1, step.children[0]),
        serializer.fromStep(indentation + 1, step, step.children[0]),
        whitespace,
        serializer.fromText("{", step),
        ...step.cases
            .map((caseValues, i) => [
                ...caseValues.reduce<Array<T>>(
                    (prev, caseValue) => [
                        ...prev,
                        caseWhitespace,
                        serializer.fromText(`case ${serializeConstant(caseValue)}:`, step),
                    ],
                    []
                ),
                serializer.getWhitespace(indentation + 2, step.children[i + 1]),
                serializer.fromStep(indentation + 2, step, step.children[i + 1]),
            ])
            .reduce<Array<T>>((v1, v2) => v1.concat(v2), []),
        whitespace,
        serializer.fromText("}", step)
    )
}

function serializeParallel<T>(step: ParsedParallel, serializer: Serializer<T>, indentation: number): T {
    const whitespace = serializer.getWhitespace(indentation, step)
    return serializer.join(
        ...insertBetweenAll(
            step.children.map((child) => serializer.fromStep(indentation, step, child)),
            serializer.join(serializer.fromText(" |", step), whitespace)
        )
    )
}

function serializeRaw<T>(step: ParsedRaw, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText(serializeConstant(step.value), step)
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

function serializeSequentialAbstract<T>(step: ParsedSequantial, serializer: Serializer<T>, indentation: number): T {
    const whitespace = serializer.getWhitespace(indentation, step)
    return serializer.join(
        ...insertBetweenAll(
            step.children.map((child) => serializer.fromStep(indentation, step, child)),
            serializer.join(serializer.fromText(" ->", step), whitespace)
        )
    )
}

function serializeSymbolAbstract<T>(step: ParsedSymbol, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText(step.identifier, step)
}

function serializeThisAbstract<T>(step: ParsedThis, serializer: Serializer<T>, indentation: number): T {
    return serializer.fromText("this", step)
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
