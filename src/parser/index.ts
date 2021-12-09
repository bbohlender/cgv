import { Grammar, Parser } from "nearley"
import grammar from "./parser"

const G = Grammar.fromCompiled(grammar)

export function parse(text: string): ParsedGrammarResult {
    const parser = new Parser(G)
    parser.feed(text)
    if (parser.results.length === 0) {
        throw new Error("unexpected end of input")
    }
    return parser.results[0]
}

export type ParsedEventResult = (values: Array<any>) => Array<any>
export type ParsedRuleResult = Array<ParsedRuleStepResult>
export type ParsedRuleStepResult = ParsedRuleOperationResult | ParsedRuleSymbolResult | ParsedRuleEventResult
export type ParsedRuleOperationResult = {
    type: "operation"
    identifier: string
}
export type ParsedRuleSymbolResult = {
    type: "symbol"
    identifier: string
}
export type ParsedRuleEventResult = {
    type: "event"
    identifier: string
}

export type ParsedEventsResult = {
    [EventId in string]: ParsedEventResult
}
export type ParsedRulesResult = {
    [Symbol in string]: ParsedRuleResult
}

export type ParsedGrammarResult = {
    rules: ParsedRulesResult
    events: ParsedEventsResult
}
