import { Grammar, Parser } from "nearley"
import grammar from "./parser"

const G = Grammar.fromCompiled(grammar)

export function parse(text: string): ParsedVerse {
    const parser = new Parser(G)
    parser.feed(text)
    if (parser.results.length === 0) {
        throw new Error("unexpected end of input")
    }
    return parser.results[0]
}

export type ParsedTransformation =
    | ParsedParallel
    | ParsedSequantial
    | ParsedOperation
    | ParsedNounReference
    | ParsedRaw
    | ParsedThis
    | ParsedBinaryOperator
    | ParsedUnaryOperator
    | ParsedIf
    | ParsedSwitch
    | ParsedSetVariable
    | ParsedGetVariable
    | ParsedReturn
    | ParsedStochasticSwitch
    | ParsedNull

export type ParsedParallel = {
    type: "parallel"
    childrenIds: Array<string>
}

export type ParsedSequantial = {
    type: "sequential"
    childrenIds: Array<string>
}
export type ParsedOperation = {
    type: "operation"
    childrenIds: Array<string>
    identifier: string
}
export type ParsedNounReference = {
    type: "nounReference"
    identifier: string
    childrenIds?: undefined
}
export type ParsedRaw = {
    type: "raw"
    value: any
    childrenIds?: undefined
}
export type ParsedThis = {
    type: "this"
    childrenIds?: undefined
}
export type ParsedReturn = {
    type: "return"
    childrenIds?: undefined
}
export type ParsedUnaryOperator = {
    type: "!" | "-"
    childrenIds: [valueId: string]
}
export type ParsedStochasticSwitch = {
    type: "stochasticSwitch"
    probabilities: Array<number> //should add up to ~1
    childrenIds: Array<string>
}
export type ParsedNull = {
    type: "null"
    childrenIds?: undefined
}
export type ParsedBinaryOperator = {
    type:
        | "+"
        | "-"
        | "*"
        | "/"
        | "%"
        | "&&"
        | "||"
        | "=="
        | "!="
        | "<"
        | "<="
        | ">"
        | ">="
    childrenIds: [op1: string, op2: string]
}
export type ParsedIf = {
    type: "if"
    childrenIds: [conditionId: string, ifValueId: string, elseValueId: string]
}
export type ParsedSwitch = {
    type: "switch"
    cases: Array<Array<any>>
    childrenIds: Array<string>
}
export type ParsedSetVariable = {
    type: "setVariable"
    identifier: string
    childrenIds: [valueId: string]
}
export type ParsedGetVariable = {
    type: "getVariable"
    identifier: string
    childrenIds?: undefined
}

export type ParsedVerse = {
    descriptions: Array<ParsedDescription>
    transformations: { [Id in string]: ParsedTransformation }
    nouns: { [Id in string]: ParsedNoun }
}
export type ParsedDescription = {
    name: string
    rootNounId: string
    nounIds: Array<string>
    config: { [Name in string]: any }
}
export type ParsedNoun = {
    name: string
    rootTransformationId: string
}
