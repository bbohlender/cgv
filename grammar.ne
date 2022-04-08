@preprocessor typescript
@{%
import moo from "moo";

const lexer = moo.compile({
    returnSymbol: /return/,
    nullSymbol: /null/,
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
%}
@lexer lexer

GrammarDefinition       ->  ws RuleDefinition ws                                            {% ([,[identifier, steps]]) => ({ [identifier]: steps }) %}
                        |   ws RuleDefinition %ws GrammarDefinition                         {% ([,[identifier, steps],,prev]) => { if(identifier in prev) { throw new Error(`rule "${identifier}" is already defined`) } else { return { [identifier]: steps, ...prev } } } %}
                        |   ws                                                              {% () => ({ }) %}

RuleDefinition          ->  %identifier ws %arrow ws Steps                                  {% ([{ value },,,,steps]) => [value, steps] %}

Steps                   ->  ParallelSteps                                                   {% ([steps]) => steps %}

ParallelSteps           ->  ParallelStep:+ SequentialSteps                                  {% ([sequentials,sequential]) => ({ type: "parallel", children: [...sequentials, sequential] }) %}
                        |   SequentialSteps                                                 {% ([sequential]) => sequential %}
ParallelStep            ->  SequentialSteps ws %parallel ws                                 {% ([sequential]) => sequential %}

SequentialSteps         ->  SequentialStep:+ OrOperation                                    {% ([primaries,primary]) => ({ type: "sequential", children: [...primaries, primary] }) %}
                        |   OrOperation                                                     {% ([primary]) => primary %}
SequentialStep          ->  OrOperation ws %arrow ws                                        {% ([primary]) => primary %}

OrOperation             ->  OrOperation ws %or ws AndOperation                              {% ([op1,,,,op2]) => ({ type: "or", children: [op1, op2] }) %}
                        |   AndOperation                                                    {% ([value]) => value %}
AndOperation            ->  AndOperation ws %and ws NegateOperation                         {% ([op1,,,,op2]) => ({ type: "and", children: [op1, op2] }) %}
                        |   NegateOperation                                                 {% ([value]) => value %}
NegateOperation         ->  %not ws NegateOperation                                         {% ([,,op1]) => ({ type: "not", children: [op1] }) %}
                        |   ComparisonOperation                                             {% ([value]) => value %}

ComparisonOperation     ->  EquityOperation                                                 {% ([value]) => value %}

EquityOperation         ->  EqualOperation                                                  {% ([value]) => value %}
                        |   UnequalOperation                                                {% ([value]) => value %}
                        |   RelationalOperation                                             {% ([value]) => value %}

EqualOperation          ->  EquityOperation ws %doubleEqual ws RelationalOperation                {% ([op1,,,,op2]) => ({ type: "equal", children: [op1, op2] }) %}
UnequalOperation        ->  EquityOperation ws %unequal ws RelationalOperation              {% ([op1,,,,op2]) => ({ type: "unequal", children: [op1, op2] }) %}

RelationalOperation     ->  SmallerOperation                                                {% ([value]) => value %}
                        |   SmallerEqualOperation                                           {% ([value]) => value %}
                        |   GreaterOperation                                                {% ([value]) => value %}
                        |   GreaterEqualOperation                                           {% ([value]) => value %}
                        |   ArithmeticOperation                                             {% ([value]) => value %}

SmallerOperation        ->  RelationalOperation ws %smaller ws ArithmeticOperation          {% ([op1,,,,op2]) => ({ type: "smaller", children: [op1, op2] }) %}
SmallerEqualOperation   ->  RelationalOperation ws %smallerEqual ws ArithmeticOperation     {% ([op1,,,,op2]) => ({ type: "smallerEqual", children: [op1, op2] }) %}
GreaterOperation        ->  RelationalOperation ws %greater ws ArithmeticOperation          {% ([op1,,,,op2]) => ({ type: "greater", children: [op1, op2] }) %}
GreaterEqualOperation   ->  RelationalOperation ws %greaterEqual ws ArithmeticOperation     {% ([op1,,,,op2]) => ({ type: "greaterEqual", children: [op1, op2] }) %}

ArithmeticOperation     ->  LineOperation                                                   {% ([value]) => value %}

LineOperation           ->  AddOperation                                                    {% ([value]) => value %}
                        |   SubtractOperation                                               {% ([value]) => value %}
                        |   PointOperation                                                  {% ([value]) => value %}

AddOperation            ->  LineOperation ws %plus ws PointOperation                        {% ([op1,,,,op2]) => ({ type: "add", children: [op1, op2] }) %}
SubtractOperation       ->  LineOperation ws %minus ws PointOperation                       {% ([op1,,,,op2]) => ({ type: "subtract", children: [op1, op2] }) %}

PointOperation          ->  MultiplyOperation                                               {% ([value]) => value %}
                        |   DivideOperation                                                 {% ([value]) => value %}
                        |   ModuloOperation                                                 {% ([value]) => value %}
                        |   InvertOperation                                                 {% ([value]) => value %}

DivideOperation         ->  PointOperation ws %divide ws InvertOperation                    {% ([op1,,,,op2]) => ({ type: "divide", children: [op1, op2] }) %}
MultiplyOperation       ->  PointOperation ws %multiply ws InvertOperation                  {% ([op1,,,,op2]) => ({ type: "multiply", children: [op1, op2] }) %}
ModuloOperation         ->  PointOperation ws %percent ws InvertOperation                    {% ([op1,,,,op2]) => ({ type: "modulo", children: [op1, op2] }) %}

InvertOperation         ->  %minus ws InvertOperation                                       {% ([,,op1]) => ({ type: "invert", children: [op1] }) %}
                        |   Step                                                            {% ([value]) => value %}

Step                    ->  Operation                                                       {% ([operation]) => operation %}
                        |   Symbol                                                          {% ([symbol]) => symbol %}
                        |   %thisSymbol                                                     {% () => ({ type: "this" }) %}
                        |   GetVariable                                                     {% ([getVariable]) => getVariable %}
                        |   SetVariable                                                     {% ([setVariable]) => setVariable %}
                        |   Constant                                                        {% ([value]) => ({ type: "raw", value }) %}
                        |   Conditional                                                     {% ([operation]) => operation %}
                        |   %returnSymbol                                                   {% () => ({ type: "return" }) %}
                        |   %nullSymbol                                                     {% () => ({ type: "null" }) %}
                        |   %openBracket Steps ws %closedBracket                            {% ([,steps]) => steps %}
                        |   Random                                                          {% ([random]) => random %}

Random                  ->  %openCurlyBracket RandomStep:* ws %closedCurlyBracket           {% ([,steps]) => ({ type: "random", probabilities: steps.map(({ probability }: any) => probability), children: steps.map(({ steps }: any) => steps) }) %}
RandomStep              ->  ws %number %percent ws %colon ws Steps                          {% ([,{ value },,,,, steps]) => ({ probability: Number.parseFloat(value) / 100, steps }) %}

Operation               ->  %identifier %openBracket EmptyParameters ws %closedBracket      {% ([{ value },,children]) => ({ type: "operation", children, identifier: value }) %}
EmptyParameters         ->  ws Parameters                                                   {% ([,parameters]) => parameters%}
                        |   null                                                            {% () => [] %}
Parameters              ->  Parameter:* Steps                                               {% ([stepsList, steps]) => [...stepsList, steps] %}
Parameter               ->  Steps ws %comma ws                                              {% ([steps]) =>  steps %}

Symbol                  ->  %identifier                                                     {% ([{ value }]) => ({ type: "symbol", identifier: value }) %}

ws                      ->  %ws | null

Constant                ->  %boolean                                                        {% ([{ value }]) => value === "true" %}
                        |   %string                                                         {% ([{ value }]) => value.slice(1, -1) %}
                        |   %number                                                         {% ([{ value }]) => Number.parseFloat(value) %}
                        |   %int                                                            {% ([{ value }]) => Number.parseInt(value) %}

GetVariable             ->  %thisSymbol %point %identifier                                  {% ([,,{ value: identifier }]) => ({ type: "getVariable", identifier }) %}
SetVariable             ->  %thisSymbol %point %identifier ws %equal ws Step                {% ([,,{ value: identifier },,,,value]) => ({ type: "setVariable", identifier, children: [value] }) %}

Conditional             ->  IfThenElse                                                      {% ([value]) => value %}                               
                        |   Switch                                                          {% ([value]) => value %}

IfThenElse              ->  %ifSymbol %ws Steps %ws Then ws Else                                                {% ([,,condition,,ifStep,,elseStep]) => ({ type: "if", children: [condition, ifStep, elseStep] }) %}
Then                    ->  %thenSymbol ws %openCurlyBracket ws Steps ws %closedCurlyBracket                    {% ([,,,,steps]) => steps %}
Else                    ->  %elseSymbol ws %openCurlyBracket ws Steps ws %closedCurlyBracket                    {% ([,,,,steps]) => steps %}

Switch                  ->  %switchSymbol %ws Steps ws %openCurlyBracket SwitchCase:* ws %closedCurlyBracket    {% ([,,value,,,cases]) => ({ type: "switch", cases: cases.map(({ caseValue }: any) => caseValue), children: [value, ...cases.map(({ steps }: any) => steps)] }) %}
SwitchCase              ->  ws %caseSymbol %ws Constant %colon ws Steps                                         {% ([,,,caseValue,,,steps]) => ({ caseValue, steps }) %}