// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
// Bypasses TS6133. Allow declared but unused functions.
// @ts-ignore
function id(d: any[]): any { return d[0]; }
declare var ws: any;
declare var identifier: any;
declare var arrow: any;
declare var parallel: any;
declare var or: any;
declare var and: any;
declare var not: any;
declare var doubleEqual: any;
declare var unequal: any;
declare var smaller: any;
declare var smallerEqual: any;
declare var greater: any;
declare var greaterEqual: any;
declare var plus: any;
declare var minus: any;
declare var divide: any;
declare var multiply: any;
declare var percent: any;
declare var thisSymbol: any;
declare var returnSymbol: any;
declare var openBracket: any;
declare var closedBracket: any;
declare var openCurlyBracket: any;
declare var closedCurlyBracket: any;
declare var number: any;
declare var colon: any;
declare var comma: any;
declare var js: any;
declare var boolean: any;
declare var string: any;
declare var int: any;
declare var point: any;
declare var equal: any;
declare var ifSymbol: any;
declare var thenSymbol: any;
declare var elseSymbol: any;
declare var switchSymbol: any;

import moo from "moo";

const lexer = moo.compile({
    returnSymbol: /return/,
    thisSymbol: /this/,
    ifSymbol: /if/,
    thenSymbol: /then/,
    elseSymbol: /else/,
    switchSymbol: /switch/,
    caseSymbol: /case/,
    arrow: /->/,
    openBracket: /\(/,
    closedBracket: /\)/,
    openCurlyBracket: /{/,
    closedCurlyBracket: /}/,
    point: /\./,
    comma: /,/,
    colon: /:/,
    smallerEqual: /<=/,
    greaterEqual: />=/,
    smaller: /</,
    greater: />/,
    doubleEqual: /==/,
    equal: /=/,
    unequal: /!=/,
    and: /&&/,
    or: /\|\|/,
    not: /!/,
    parallel: /\|/,
    int: /0[Xx][\da-fA-F]+|0[bB][01]+/,
    number: /-?\d+(?:\.\d+)?/,
    string: /"[^"]*"/,
    boolean: /true|false/,
    plus: /\+/,
    minus: /-/,
    multiply: /\*/,
    percent: /%/,
    divide: /\//,
    identifier: /[a-zA-Z_$]+\w*/,
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
    {"name": "GrammarDefinition", "symbols": ["ws", "RuleDefinition", "ws"], "postprocess": ([,[identifier, steps]]) => ({ [identifier]: steps })},
    {"name": "GrammarDefinition", "symbols": ["ws", "RuleDefinition", (lexer.has("ws") ? {type: "ws"} : ws), "GrammarDefinition"], "postprocess": ([,[identifier, steps],,prev]) => { if(identifier in prev) { throw new Error(`rule "${identifier}" is already defined`) } else { return { [identifier]: steps, ...prev } } }},
    {"name": "GrammarDefinition", "symbols": ["ws"], "postprocess": () => ({ })},
    {"name": "RuleDefinition", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("arrow") ? {type: "arrow"} : arrow), "ws", "Steps"], "postprocess": ([{ value },,,,steps]) => [value, steps]},
    {"name": "Steps", "symbols": ["ParallelSteps"], "postprocess": ([steps]) => steps},
    {"name": "ParallelSteps$ebnf$1", "symbols": ["ParallelStep"]},
    {"name": "ParallelSteps$ebnf$1", "symbols": ["ParallelSteps$ebnf$1", "ParallelStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "ParallelSteps", "symbols": ["SequentialSteps", "ParallelSteps$ebnf$1"], "postprocess": ([sequential,sequentials]) => ({ type: "parallel", children: [sequential, ...sequentials] })},
    {"name": "ParallelSteps", "symbols": ["SequentialSteps"], "postprocess": ([sequential]) => sequential},
    {"name": "ParallelStep", "symbols": ["ws", (lexer.has("parallel") ? {type: "parallel"} : parallel), "SequentialSteps"], "postprocess": ([,,sequential]) => sequential},
    {"name": "SequentialSteps$ebnf$1", "symbols": ["SequentialStep"]},
    {"name": "SequentialSteps$ebnf$1", "symbols": ["SequentialSteps$ebnf$1", "SequentialStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SequentialSteps", "symbols": ["PrimarySteps", "SequentialSteps$ebnf$1"], "postprocess": ([primary,primaries]) => ({ type: "sequential", children: [primary, ...primaries] })},
    {"name": "SequentialSteps", "symbols": ["PrimarySteps"], "postprocess": ([primary]) => primary},
    {"name": "SequentialStep", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws), "PrimarySteps"], "postprocess": ([,primary]) => primary},
    {"name": "PrimarySteps", "symbols": ["ws", "BasicOperation"], "postprocess": ([,operation]) => operation},
    {"name": "BasicOperation", "symbols": ["BooleanOperation"], "postprocess": ([value]) => value},
    {"name": "BooleanOperation", "symbols": ["OrOperation"], "postprocess": ([value]) => value},
    {"name": "OrOperation", "symbols": ["OrOperation", "ws", (lexer.has("or") ? {type: "or"} : or), "ws", "AndOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "or", children: [op1, op2] })},
    {"name": "OrOperation", "symbols": ["AndOperation"], "postprocess": ([value]) => value},
    {"name": "AndOperation", "symbols": ["AndOperation", "ws", (lexer.has("and") ? {type: "and"} : and), "ws", "NegateOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "and", children: [op1, op2] })},
    {"name": "AndOperation", "symbols": ["NegateOperation"], "postprocess": ([value]) => value},
    {"name": "NegateOperation", "symbols": [(lexer.has("not") ? {type: "not"} : not), "ws", "NegateOperation"], "postprocess": ([,,op1]) => ({ type: "not", children: [op1] })},
    {"name": "NegateOperation", "symbols": ["ComparisonOperation"], "postprocess": ([value]) => value},
    {"name": "ComparisonOperation", "symbols": ["EquityOperation"], "postprocess": ([value]) => value},
    {"name": "EquityOperation", "symbols": ["EqualOperation"], "postprocess": ([value]) => value},
    {"name": "EquityOperation", "symbols": ["UnequalOperation"], "postprocess": ([value]) => value},
    {"name": "EquityOperation", "symbols": ["RelationalOperation"], "postprocess": ([value]) => value},
    {"name": "EqualOperation", "symbols": ["EquityOperation", "ws", (lexer.has("doubleEqual") ? {type: "doubleEqual"} : doubleEqual), "ws", "RelationalOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "equal", children: [op1, op2] })},
    {"name": "UnequalOperation", "symbols": ["EquityOperation", "ws", (lexer.has("unequal") ? {type: "unequal"} : unequal), "ws", "RelationalOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "unequal", children: [op1, op2] })},
    {"name": "RelationalOperation", "symbols": ["SmallerOperation"], "postprocess": ([value]) => value},
    {"name": "RelationalOperation", "symbols": ["SmallerEqualOperation"], "postprocess": ([value]) => value},
    {"name": "RelationalOperation", "symbols": ["GreaterOperation"], "postprocess": ([value]) => value},
    {"name": "RelationalOperation", "symbols": ["GreaterEqualOperation"], "postprocess": ([value]) => value},
    {"name": "RelationalOperation", "symbols": ["ArithmeticOperation"], "postprocess": ([value]) => value},
    {"name": "SmallerOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("smaller") ? {type: "smaller"} : smaller), "ws", "ArithmeticOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "smaller", children: [op1, op2] })},
    {"name": "SmallerEqualOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("smallerEqual") ? {type: "smallerEqual"} : smallerEqual), "ws", "ArithmeticOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "smallerEqual", children: [op1, op2] })},
    {"name": "GreaterOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("greater") ? {type: "greater"} : greater), "ws", "ArithmeticOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "greater", children: [op1, op2] })},
    {"name": "GreaterEqualOperation", "symbols": ["RelationalOperation", "ws", (lexer.has("greaterEqual") ? {type: "greaterEqual"} : greaterEqual), "ws", "ArithmeticOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "greaterEqual", children: [op1, op2] })},
    {"name": "ArithmeticOperation", "symbols": ["LineOperation"], "postprocess": ([value]) => value},
    {"name": "LineOperation", "symbols": ["AddOperation"], "postprocess": ([value]) => value},
    {"name": "LineOperation", "symbols": ["SubtractOperation"], "postprocess": ([value]) => value},
    {"name": "LineOperation", "symbols": ["PointOperation"], "postprocess": ([value]) => value},
    {"name": "AddOperation", "symbols": ["LineOperation", "ws", (lexer.has("plus") ? {type: "plus"} : plus), "ws", "PointOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "add", children: [op1, op2] })},
    {"name": "SubtractOperation", "symbols": ["LineOperation", "ws", (lexer.has("minus") ? {type: "minus"} : minus), "ws", "PointOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "subtract", children: [op1, op2] })},
    {"name": "PointOperation", "symbols": ["MultiplyOperation"], "postprocess": ([value]) => value},
    {"name": "PointOperation", "symbols": ["DivideOperation"], "postprocess": ([value]) => value},
    {"name": "PointOperation", "symbols": ["ModuloOperation"], "postprocess": ([value]) => value},
    {"name": "PointOperation", "symbols": ["InvertOperation"], "postprocess": ([value]) => value},
    {"name": "DivideOperation", "symbols": ["PointOperation", "ws", (lexer.has("divide") ? {type: "divide"} : divide), "ws", "InvertOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "divide", children: [op1, op2] })},
    {"name": "MultiplyOperation", "symbols": ["PointOperation", "ws", (lexer.has("multiply") ? {type: "multiply"} : multiply), "ws", "InvertOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "multiply", children: [op1, op2] })},
    {"name": "ModuloOperation", "symbols": ["PointOperation", "ws", (lexer.has("percent") ? {type: "percent"} : percent), "ws", "InvertOperation"], "postprocess": ([op1,,,,op2]) => ({ type: "modulo", children: [op1, op2] })},
    {"name": "InvertOperation", "symbols": [(lexer.has("minus") ? {type: "minus"} : minus), "ws", "InvertOperation"], "postprocess": ([,,op1]) => ({ type: "invert", children: [op1] })},
    {"name": "InvertOperation", "symbols": ["Step"], "postprocess": ([value]) => value},
    {"name": "Step", "symbols": ["Operation"], "postprocess": ([operation]) => operation},
    {"name": "Step", "symbols": ["Symbol"], "postprocess": ([symbol]) => symbol},
    {"name": "Step", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol)], "postprocess": () => ({ type: "this" })},
    {"name": "Step", "symbols": ["GetVariable"], "postprocess": ([getVariable]) => getVariable},
    {"name": "Step", "symbols": ["SetVariable"], "postprocess": ([setVariable]) => setVariable},
    {"name": "Step", "symbols": ["Constant"], "postprocess": ([value]) => ({ type: "raw", value })},
    {"name": "Step", "symbols": ["ConditionalOperation"], "postprocess": ([operation]) => operation},
    {"name": "Step", "symbols": [(lexer.has("returnSymbol") ? {type: "returnSymbol"} : returnSymbol)], "postprocess": () => ({ type: "return" })},
    {"name": "Step", "symbols": [(lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "Steps", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([,steps]) => ({ type: "bracket", children: [steps] })},
    {"name": "Step", "symbols": ["RandomSteps"], "postprocess": ([random]) => random},
    {"name": "RandomSteps$ebnf$1", "symbols": ["RandomStep"]},
    {"name": "RandomSteps$ebnf$1", "symbols": ["RandomSteps$ebnf$1", "RandomStep"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "RandomSteps", "symbols": [(lexer.has("openCurlyBracket") ? {type: "openCurlyBracket"} : openCurlyBracket), "RandomSteps$ebnf$1", "ws", (lexer.has("closedCurlyBracket") ? {type: "closedCurlyBracket"} : closedCurlyBracket)], "postprocess": ([,steps]) => ({ type: "random", probabilities: steps.map(({ probability }: any) => probability), children: steps.map(({ steps }: any) => steps) })},
    {"name": "RandomStep", "symbols": ["ws", (lexer.has("number") ? {type: "number"} : number), (lexer.has("percent") ? {type: "percent"} : percent), "ws", (lexer.has("colon") ? {type: "colon"} : colon), "ws", "Steps"], "postprocess": ([,{ value },,,,, steps]) => ({ probability: Number.parseFloat(value) / 100, steps })},
    {"name": "Operation", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier), (lexer.has("openBracket") ? {type: "openBracket"} : openBracket), "EmptyParameters", "ws", (lexer.has("closedBracket") ? {type: "closedBracket"} : closedBracket)], "postprocess": ([{ value },,children]) => ({ type: "operation", children, identifier: value })},
    {"name": "EmptyParameters", "symbols": ["Parameters"], "postprocess": ([parameters]) => parameters},
    {"name": "EmptyParameters", "symbols": [], "postprocess": () => []},
    {"name": "Parameters$ebnf$1", "symbols": ["Parameter"]},
    {"name": "Parameters$ebnf$1", "symbols": ["Parameters$ebnf$1", "Parameter"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "Parameters", "symbols": ["Steps", "Parameters$ebnf$1"], "postprocess": ([steps, stepsList]) => [steps, ...stepsList]},
    {"name": "Parameters", "symbols": ["Steps"], "postprocess": ([steps]) => [steps]},
    {"name": "Parameter", "symbols": ["ws", (lexer.has("comma") ? {type: "comma"} : comma), "Steps"], "postprocess": ([,,steps]) =>  steps},
    {"name": "Symbol", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([{ value }]) => ({ type: "symbol", identifier: value })},
    {"name": "JS", "symbols": [(lexer.has("js") ? {type: "js"} : js)], "postprocess": ([{ value }]) => eval((value as string).replace(/"([^"]+)"/, (_,fn) => fn))},
    {"name": "ws", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "ws", "symbols": []},
    {"name": "Constant", "symbols": [(lexer.has("boolean") ? {type: "boolean"} : boolean)], "postprocess": ([{ value }]) => value === "true"},
    {"name": "Constant", "symbols": [(lexer.has("string") ? {type: "string"} : string)], "postprocess": ([{ value }]) => value.slice(1, -1)},
    {"name": "Constant", "symbols": [(lexer.has("number") ? {type: "number"} : number)], "postprocess": ([{ value }]) => Number.parseFloat(value)},
    {"name": "Constant", "symbols": [(lexer.has("int") ? {type: "int"} : int)], "postprocess": ([{ value }]) => Number.parseInt(value)},
    {"name": "GetVariable", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol), (lexer.has("point") ? {type: "point"} : point), (lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": ([,,identifier]) => ({ type: "getVariable", identifier })},
    {"name": "SetVariable", "symbols": [(lexer.has("thisSymbol") ? {type: "thisSymbol"} : thisSymbol), (lexer.has("point") ? {type: "point"} : point), (lexer.has("identifier") ? {type: "identifier"} : identifier), "ws", (lexer.has("equal") ? {type: "equal"} : equal), "ws", "Step"], "postprocess": ([,,identifier,,,,value]) => ({ type: "setVariable", identifier, children: [value] })},
    {"name": "ConditionalOperation", "symbols": ["IfThenElseOperation"], "postprocess": ([value]) => value},
    {"name": "ConditionalOperation", "symbols": ["SwitchOperation"], "postprocess": ([value]) => value},
    {"name": "IfThenElseOperation", "symbols": [(lexer.has("ifSymbol") ? {type: "ifSymbol"} : ifSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Step", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("thenSymbol") ? {type: "thenSymbol"} : thenSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Step", (lexer.has("ws") ? {type: "ws"} : ws), (lexer.has("elseSymbol") ? {type: "elseSymbol"} : elseSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Step"], "postprocess": ([,,condition,,,,ifStep,,,,elseStep]) => ({ type: "if", children: [condition, ifStep, elseStep] })},
    {"name": "SwitchOperation$ebnf$1", "symbols": ["SwitchCase"]},
    {"name": "SwitchOperation$ebnf$1", "symbols": ["SwitchOperation$ebnf$1", "SwitchCase"], "postprocess": (d) => d[0].concat([d[1]])},
    {"name": "SwitchOperation", "symbols": [(lexer.has("switchSymbol") ? {type: "switchSymbol"} : switchSymbol), (lexer.has("ws") ? {type: "ws"} : ws), "Step", "SwitchOperation$ebnf$1"], "postprocess": ([,,value,cases]) => ({ type: "switch", cases: cases.map(({ case }: any) => case), children: [value, ...cases.map(({ steps }: any) => steps)] })},
    {"name": "SwitchCase", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws), "Constant", (lexer.has("ws") ? {type: "ws"} : ws), "Step", (lexer.has("colon") ? {type: "colon"} : colon), "ws", "Step"], "postprocess": ([,,,case,,,steps]) => ({ case, steps })}
  ],
  ParserStart: "GrammarDefinition",
};

export default grammar;
