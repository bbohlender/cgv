// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var ws: any;
declare var identifier: any;
declare var arrow: any;
declare var equal: any;
declare var openBracket: any;
declare var closedBracket: any;
declare var event: any;
declare var js: any;

import moo from "moo";

const lexer = moo.compile({
    arrow: /->/,
    equal: /=/,
    openBracket: /\(/,
    closedBracket: /\)/,
    event: /event/,
    identifier: /[A-Za-z]+/,
    js: /".+?"/,
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
    {"name": "Grammar", "symbols": ["ws", "Rule", "ws"], "postprocess": ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} })},
    {"name": "Grammar", "symbols": ["ws", "Event", "ws"], "postprocess": ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } })},
    {"name": "Grammar", "symbols": ["ws", "Rule", (lexer.has("ws") ? {type: "ws"} : ws), "Grammar"], "postprocess": ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events })},
    {"name": "Grammar", "symbols": ["ws", "Event", (lexer.has("ws") ? {type: "ws"} : ws), "Grammar"], "postprocess": ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } })},
    {"name": "Grammar", "symbols": ["ws"], "postprocess": () => ({ rules: {}, events: {} })},
    {"name": "Rule", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("arrow") ? {type: "arrow"} : arrow), "ws", "RuleSteps"], "postprocess": ([{ value },,,, steps]) => [value.trim(), steps]},
    {"name": "RuleSteps", "symbols": ["ws", "RuleStep"], "postprocess": (val) => [val[1]]},
    {"name": "RuleSteps", "symbols": ["ws", "RuleStep", (lexer.has("ws") ? {type: "ws"} : ws), "RuleSteps"], "postprocess": (val) => [val[1], ...val[3]]},
    {"name": "RuleStep", "symbols": ["RuleOperation"], "postprocess": ([operation]) => operation},
    {"name": "RuleStep", "symbols": ["RuleSymbol"], "postprocess": ([symbol]) => symbol},
    {"name": "RuleStep", "symbols": ["RuleEvent"], "postprocess": ([event]) => event},
    {"name": "Event", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("equal") ? {type: "equal"} : equal), "ws", "JS"], "postprocess": ([{ value },,,, fn]) => [value.trim(), fn]},
    {"name": "RuleOperation", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([{ value }]) => ({ type: "operation", identifier: value.trim() })},
    {"name": "RuleSymbol", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([{ value }]) => ({ type: "symbol", identifier: value.trim() })},
    {"name": "RuleEvent", "symbols": [(lexer.has("event") ? {type: "event"} : event), (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "ws", (lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([,,, { value }]) => ({ type: "event", identifier: value.trim() })},
    {"name": "JS", "symbols": [(lexer.has("js") ? {type: "js"} : js)], "postprocess": ([{ value }]) => eval((value as string).replace(/"(.+?)"/, (_,fn) => fn))},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": []}
  ],
  ParserStart: "Grammar",
};

export default grammar;
