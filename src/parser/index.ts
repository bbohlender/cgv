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

export type ParsedSymbolDefintion = Array<ParsedValue>

export type ParsedValue = ParsedOperation | ParsedSymbol | ParsedEvent | ParsedJS

export type ParsedOperation = {
    type: "operation"
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
export type ParsedJS = {
    type: "js"
    value: any
}

export type ParsedEventDefinitions = {
    [EventId in string]: ParsedEventDefintion
}
export type ParsedRuleDefinitions = {
    [Symbol in string]: ParsedSymbolDefintion
}

export type ParsedGrammarDefinition = {
    rules: ParsedRuleDefinitions
    events: ParsedEventDefinitions
}
