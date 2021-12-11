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

export type ParsedEventDefintion = (values: Array<any>) => Array<Array<any>>

export type ParsedValues = ParsedParallelValues | ParsedSequantialValues | ParsedOperation | ParsedSymbol | ParsedEvent | ParsedRaw

export type ParsedParallelValues = {
    type: "parallel",
    values: Array<ParsedValues>
}

export type ParsedSequantialValues = {
    type: "sequential"
    values: Array<ParsedValues>
}

export type ParsedOperation = {
    type: "operation"
    parameters: ParsedValues
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

export type ParsedEventDefinitions = {
    [EventId in string]: ParsedEventDefintion
}
export type ParsedRuleDefinitions = {
    [Symbol in string]: ParsedValues
}

export type ParsedGrammarDefinition = {
    rules: ParsedRuleDefinitions
    events: ParsedEventDefinitions
}
