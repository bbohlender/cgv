import { Grammar, Parser } from "nearley"
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

export type ParsedSteps =
    | ParsedParallel
    | ParsedSequantial
    | ParsedOperation
    | ParsedSymbol
    | ParsedRaw
    | ParsedThis
    | ParsedBracket
    | ParsedBinaryOperator
    | ParsedUnaryOperator
    | ParsedIf
    | ParsedSwitch
    | ParsedSetVariable
    | ParsedGetVariable
    | ParsedReturn
    | ParsedRandom

export type ParsedParallel = {
    type: "parallel"
    children: Array<ParsedSteps>
}

export type ParsedSequantial = {
    type: "sequential"
    children: Array<ParsedSteps>
}
export type ParsedBracket = {
    type: "bracket"
    children: [value: ParsedSteps]
}
export type ParsedOperation = {
    type: "operation"
    children: Array<ParsedSteps>
    identifier: string
}
export type ParsedSymbol = {
    type: "symbol"
    identifier: string
    children?: undefined
}
export type ParsedRaw = {
    type: "raw"
    value: any
    children?: undefined
}
export type ParsedThis = {
    type: "this"
    children?: undefined
}
export type ParsedReturn = {
    type: "return"
    children?: undefined
}
export type ParsedUnaryOperator = {
    type: "not" | "invert"
    children: [value: ParsedSteps]
}
export type ParsedRandom = {
    type: "random"
    probabilities: Array<number> //should add up to ~1
    children: Array<ParsedSteps>
}
export type ParsedBinaryOperator = {
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
    children: [op1: ParsedSteps, op2: ParsedSteps]
}
export type ParsedIf = {
    type: "if"
    children: [condition: ParsedSteps, ifValue: ParsedSteps, elseValue: ParsedSteps]
}
export type ParsedSwitch = {
    type: "switch"
    cases: Array<any>
    children: Array<ParsedSteps>
}
export type ParsedSetVariable = {
    type: "setVariable"
    identifier: string
    children: [value: ParsedSteps]
}
export type ParsedGetVariable = {
    type: "getVariable"
    identifier: string
    children?: undefined
}

export type ParsedGrammarDefinition = {
    [Symbol in string]: ParsedSteps
}
