// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var ws: any;
declare var identifier: any;
declare var arrow: any;
declare var parallel: any;
declare var openBracket: any;
declare var closedBracket: any;
declare var thisSymbol: any;
declare var event: any;
declare var equal: any;
declare var js: any;

import moo from "moo";

const lexer = moo.compile({
    arrow: /->/,
    equal: /=/,
    openBracket: /\(/,
    closedBracket: /\)/,
    parallel: /\|/,
    event: /event/,
    thisSymbol: /this/,
    identifier: /[A-Za-z\d]+/,
    js: { match: /"[^"]+"/, lineBreaks: true },
    ws: { match: /\s+/, lineBreaks: true },
});

interface NearleyToken {
  value: any;
  [key: string]: any;
};

interface NearleyLexer {
  reset: (chunk: string, info: any) => void;
  next: () => NearleyToken | undefined;
  save: () => any;
  formatError: (token: never) => string;
  has: (tokenType: string) => boolean;
};

interface NearleyRule {
  name: string;
  symbols: NearleySymbol[];
  postprocess?: (d: any[], loc?: number, reject?: {}) => any;
};

type NearleySymbol = string | { literal: any } | { test: (token: any) => boolean };

interface Grammar {
  Lexer: NearleyLexer | undefined;
  ParserRules: NearleyRule[];
  ParserStart: string;
};

const grammar: Grammar = {
  Lexer: lexer,
  ParserRules: [
    {"name": "GrammarDefinition", "symbols": ["ws", "RuleDefinition", "ws"], "postprocess": ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} })},
    {"name": "GrammarDefinition", "symbols": ["ws", "EventDefinition", "ws"], "postprocess": ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } })},
    {"name": "GrammarDefinition", "symbols": ["ws", "RuleDefinition", (lexer.has("ws") ? {type: "ws"} : ws), "GrammarDefinition"], "postprocess": ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events })},
    {"name": "GrammarDefinition", "symbols": ["ws", "EventDefinition", (lexer.has("ws") ? {type: "ws"} : ws), "GrammarDefinition"], "postprocess": ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } })},
    {"name": "GrammarDefinition", "symbols": ["ws"], "postprocess": () => ({ rules: {}, events: {} })},
    {"name": "RuleDefinition", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("arrow") ? {type: "arrow"} : arrow), "ws", "Steps"], "postprocess": ([{ value },,,,steps]) => [value, steps]},
    {"name": "Steps", "symbols": ["ParallelSteps"], "postprocess": ([steps]) => steps},
    {"name": "EmptySteps", "symbols": ["ParallelSteps"], "postprocess": ([steps]) => steps},
    {"name": "EmptySteps", "symbols": [], "postprocess": () => ({ type: "raw", value: [] })},
    {"name": "ParallelSteps$ebnf$1", "symbols": ["ParallelStep"]},
    {"name": "ParallelSteps$ebnf$1", "symbols": ["ParallelSteps$ebnf$1", "ParallelStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ParallelSteps", "symbols": ["SequentialSteps", "ParallelSteps$ebnf$1"], "postprocess": ([sequential,sequentials]) => ({ type: "parallel", steps: [sequential, ...sequentials] })},
    {"name": "ParallelSteps", "symbols": ["SequentialSteps"], "postprocess": ([sequential]) => sequential},
    {"name": "ParallelStep", "symbols": ["ws", (lexer.has("parallel") ? {type: "parallel"} : parallel), "SequentialSteps"], "postprocess": ([,,sequential]) => sequential},
    {"name": "SequentialSteps$ebnf$1", "symbols": ["SequentialStep"]},
    {"name": "SequentialSteps$ebnf$1", "symbols": ["SequentialSteps$ebnf$1", "SequentialStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SequentialSteps", "symbols": ["PrimarySteps", "SequentialSteps$ebnf$1"], "postprocess": ([primary,primaries]) => ({ type: "sequential", steps: [primary, ...primaries] })},
    {"name": "SequentialSteps", "symbols": ["PrimarySteps"], "postprocess": ([primary]) => primary},
    {"name": "SequentialStep", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws), "PrimarySteps"], "postprocess": ([,primary]) => primary},
    {"name": "PrimarySteps", "symbols": ["ws", "Step"], "postprocess": ([,step]) => step},
    {"name": "PrimarySteps", "symbols": ["ws", (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "Steps", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([,,steps]) => steps},
    {"name": "Step", "symbols": ["Operation"], "postprocess": ([operation]) => operation},
    {"name": "Step", "symbols": ["Symbol"], "postprocess": ([symbol]) => symbol},
    {"name": "Step", "symbols": ["Event"], "postprocess": ([event]) => event},
    {"name": "Step", "symbols": ["JS"], "postprocess": ([value]) => ({ type: "raw", value })},
    {"name": "Step", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol)], "postprocess": () => ({ type: "this" })},
    {"name": "Operation", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "EmptySteps", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([{ value },,,parameters]) => ({ type: "operation", parameters, identifier: value })},
    {"name": "Symbol", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([{ value }]) => ({ type: "symbol", identifier: value })},
    {"name": "Event", "symbols": [(lexer.has("event") ? {type: "event"} : event), (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "ws", (lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([,,, { value }]) => ({ type: "event", identifier: value })},
    {"name": "EventDefinition", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("equal") ? {type: "equal"} : equal), "ws", "JS"], "postprocess": ([{ value },,,, fn]) => [value, fn]},
    {"name": "JS", "symbols": [(lexer.has("js") ? {type: "js"} : js)], "postprocess": ([{ value }]) => eval((value as string).replace(/"([^"]+)"/, (_,fn) => fn))},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": []}
  ],
  ParserStart: "GrammarDefinition",
};

export default grammar;
