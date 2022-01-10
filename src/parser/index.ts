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

export type ParsedEventDefintion = (values: Array<Array<any>>) => Array<Array<any>>

export type ParsedStep =
    | ParsedParallelValues
    | ParsedSequantialValues
    | ParsedOperation
    | ParsedSymbol
    | ParsedEvent
    | ParsedRaw
    | ParsedThis

export type ParsedParallelValues = {
    type: "parallel"
    steps: Array<ParsedStep>
}

export type ParsedSequantialValues = {
    type: "sequential"
    steps: Array<ParsedStep>
}

export type ParsedOperation = {
    type: "operation"
    parameters: ParsedStep
    identifier: string
}
export type ParsedSymbol = {
    type: "symbol"
    identifier: string
}
export type ParsedEvent = {
    type: "event"
    identifier: string
}
export type ParsedRaw = {
    type: "raw"
    value: any
}
export type ParsedThis = {
    type: "this"
}

export type ParsedEventDefinitions = {
    [EventId in string]: ParsedEventDefintion
}
export type ParsedRuleDefinitions = {
    [Symbol in string]: ParsedStep
}

export type ParsedGrammarDefinition = {
    rules: ParsedRuleDefinitions
    events: ParsedEventDefinitions
}
