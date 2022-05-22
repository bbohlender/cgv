import { Grammar, Parser } from "nearley"
import { globalizeDescription } from "../util"
import grammar from "./parser"

const G = Grammar.fromCompiled(grammar)

export function parse(text: string): ParsedGrammarDefinition {
    const parser = new Parser(G)
    parser.feed(text)
    if (parser.results.length === 0) {
        throw new Error("unexpected end of input")
    }
    return parser.results[0]
}

export function parseDescription(text: string, descriptionName: string): ParsedGrammarDefinition {
    const result = parse(text)
    //transform the result
    return globalizeDescription(result, descriptionName)
}

export type ParsedGrammarDefinition = AbstractParsedGrammarDefinition<unknown>
export type ParsedSteps = AbstractParsedSteps<unknown>
export type ParsedParallel = AbstractParsedParallel<unknown>
export type ParsedSequantial = AbstractParsedSequantial<unknown>
export type ParsedOperation = AbstractParsedOperation<unknown>
export type ParsedSymbol = AbstractParsedSymbol<unknown>
export type ParsedRaw = AbstractParsedRaw<unknown>
export type ParsedThis = AbstractParsedThis<unknown>
export type ParsedBinaryOperator = AbstractParsedBinaryOperator<unknown>
export type ParsedUnaryOperator = AbstractParsedUnaryOperator<unknown>
export type ParsedIf = AbstractParsedIf<unknown>
export type ParsedSwitch = AbstractParsedSwitch<unknown>
export type ParsedSetVariable = AbstractParsedSetVariable<unknown>
export type ParsedGetVariable = AbstractParsedGetVariable<unknown>
export type ParsedReturn = AbstractParsedReturn<unknown>
export type ParsedRandom = AbstractParsedRandom<unknown>
export type ParsedNull = AbstractParsedNull<unknown>

export type AbstractParsedSteps<T> =
    | AbstractParsedParallel<T>
    | AbstractParsedSequantial<T>
    | AbstractParsedOperation<T>
    | AbstractParsedSymbol<T>
    | AbstractParsedRaw<T>
    | AbstractParsedThis<T>
    | AbstractParsedBinaryOperator<T>
    | AbstractParsedUnaryOperator<T>
    | AbstractParsedIf<T>
    | AbstractParsedSwitch<T>
    | AbstractParsedSetVariable<T>
    | AbstractParsedGetVariable<T>
    | AbstractParsedReturn<T>
    | AbstractParsedRandom<T>
    | AbstractParsedNull<T>

export type AbstractParsedParallel<T> = {
    type: "parallel"
    children: Array<AbstractParsedSteps<T>>
} & T

export type AbstractParsedSequantial<T> = {
    type: "sequential"
    children: Array<AbstractParsedSteps<T>>
} & T
export type AbstractParsedOperation<T> = {
    type: "operation"
    children: Array<AbstractParsedSteps<T>>
    identifier: string
} & T
export type AbstractParsedSymbol<T> = {
    type: "symbol"
    identifier: string
    children?: undefined
} & T
export type AbstractParsedRaw<T> = {
    type: "raw"
    value: any
    children?: undefined
} & T
export type AbstractParsedThis<T> = {
    type: "this"
    children?: undefined
} & T
export type AbstractParsedReturn<T> = {
    type: "return"
    children?: undefined
} & T
export type AbstractParsedUnaryOperator<T> = {
    type: "not" | "invert"
    children: [value: AbstractParsedSteps<T>]
} & T
export type AbstractParsedRandom<T> = {
    type: "random"
    probabilities: Array<number> //should add up to ~1
    children: Array<AbstractParsedSteps<T>>
} & T
export type AbstractParsedNull<T> = {
    type: "null"
    children?: undefined
} & T
export type AbstractParsedBinaryOperator<T> = {
    type:
        | "add"
        | "subtract"
        | "multiply"
        | "divide"
        | "modulo"
        | "and"
        | "or"
        | "equal"
        | "unequal"
        | "smaller"
        | "smallerEqual"
        | "greater"
        | "greaterEqual"
    children: [op1: AbstractParsedSteps<T>, op2: AbstractParsedSteps<T>]
} & T
export type AbstractParsedIf<T> = {
    type: "if"
    children: [condition: AbstractParsedSteps<T>, ifValue: AbstractParsedSteps<T>, elseValue: AbstractParsedSteps<T>]
} & T
export type AbstractParsedSwitch<T> = {
    type: "switch"
    cases: Array<Array<any>>
    children: Array<AbstractParsedSteps<T>>
} & T
export type AbstractParsedSetVariable<T> = {
    type: "setVariable"
    identifier: string
    children: [value: AbstractParsedSteps<T>]
} & T
export type AbstractParsedGetVariable<T> = {
    type: "getVariable"
    identifier: string
    children?: undefined
} & T

export type AbstractParsedGrammarDefinition<T> = Array<{ name: string; step: AbstractParsedSteps<T> }>
