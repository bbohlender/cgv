@preprocessor typescript
@{%
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
    point: /\./,
    comma: /,/,
    colon: /:/,
    smallerEqual: /<=/,
    greaterEqual: />=/,
    smaller: /</,
    greater: />/,
    equal: /==/,
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
    modulo: /%/,
    divide: /\//,
    identifier: /[a-zA-Z_$]+\w*/,
    ws: { match: /\s+/, lineBreaks: true },
});
%}
@lexer lexer

GrammarDefinition   ->  ws RuleDefinition ws                                        {% ([,[identifier, steps]]) => ({ [identifier]: steps }) %}
                    |   ws RuleDefinition %ws GrammarDefinition                     {% ([,[identifier, steps],,prev]) => ({ [identifier]: steps, ...prev }) %}
                    |   ws                                                          {% () => ({ }) %}

RuleDefinition      ->  %identifier ws %arrow ws Steps                              {% ([{ value },,,,steps]) => [value, steps] %}

Steps               ->  ParallelSteps                                               {% ([steps]) => steps %}
EmptySteps          ->  ParallelSteps                                               {% ([steps]) => steps %}
                    |   null                                                        {% () => ({ type: "raw", value: [] }) %}

ParallelSteps       ->  SequentialSteps ParallelStep:+                              {% ([sequential,sequentials]) => ({ type: "parallel", steps: [sequential, ...sequentials] }) %}
                    |   SequentialSteps                                             {% ([sequential]) => sequential %}
ParallelStep        ->  ws %parallel SequentialSteps                                {% ([,,sequential]) => sequential %}

SequentialSteps     ->  PrimarySteps SequentialStep:+                               {% ([primary,primaries]) => ({ type: "sequential", steps: [primary, ...primaries] }) %}
                    |   PrimarySteps                                                {% ([primary]) => primary %}
SequentialStep      ->  %ws PrimarySteps                                            {% ([,primary]) => primary %}

PrimarySteps        ->  ws BasicOperation                                           {% ([,operation]) => operation %}

Step                ->  Operation                                                   {% ([operation]) => operation %}
                    |   Symbol                                                      {% ([symbol]) => symbol %}
                    |   %thisSymbol                                                 {% () => ({ type: "this" }) %}
                    |   GetVariable                                                    {% ([getVariable]) => getVariable %}
                    |   Constant                                                    {% ([value]) => ({ type: "raw", value }) %}
                    |   ConditionalOperation                                        {% ([operation]) => operation %}
                    |   %returnSymbol                                               {% () => ({  type: "operation", parameters: [], identifier: "return" }) %}
                    |   %openBracket Steps ws %closedBracket                        {% ([,steps]) => steps %}

Operation           ->  %identifier %openBracket EmptyParameters ws %closedBracket    {% ([{ value },,parameters]) => ({ type: "operation", parameters, identifier: value }) %}

EmptyParameters     ->  Parameters                                                  {% ([parameters]) => parameters%}
                    |   null                                                        {% () => [] %}
Parameters          ->  Steps Parameter:+                                           {% ([steps, stepsList]) => [steps, ...stepsList] %}
                    |   Steps                                                       {% ([steps]) => [steps] %}
Parameter           ->  ws %comma Steps                                             {% ([,,steps]) =>  steps %}

Symbol              ->  %identifier                                                 {% ([{ value }]) => ({ type: "symbol", identifier: value }) %}

JS                  ->  %js                                                         {% ([{ value }]) => eval((value as string).replace(/"([^"]+)"/, (_,fn) => fn)) %}
ws                  ->  %ws | null

Constant            ->  %boolean                                                    {% ([{ value }]) => value === "true" %}
                    |   %string                                                     {% ([{ value }]) => value.slice(1, -1) %}
                    |   %number                                                     {% ([{ value }]) => Number.parseFloat(value) %}
                    |   %int                                                        {% ([{ value }]) => Number.parseInt(value) %}

Variable            ->  %thisSymbol %point %identifier                              {% ([,,identifier]) => ({ type: "raw", value: identifier }) %}
GetVariable         ->  Variable                                                    {% ([name]) => ({ type: "operation", parameters: [name], identifier: "getVariable" }) %}
SetVariable         ->  Variable ws %equal ws Step                                  {% ([name,,,,step]) => ({ type: "operation", parameters: [name, step], identifier: "setVariable" }) %}

ConditionalOperation    ->  IfThenElseOperation                                     {% ([value]) => value %}                               
                        |   SwitchOperation                                         {% ([value]) => value %}

IfThenElseOperation     ->  %ifSymbol %ws Step %ws %thenSymbol %ws Step %ws %elseSymbol %ws Step    {% ([,,value,,,,ifOperation,,,,elseOperation]) => ({ type: "operation", parameters: [value, ifOperation, elseOperation], identifier: "if" }) %}

SwitchOperation         ->  %switchSymbol %ws Step SwitchCase:+                         {% ([,,value,cases]) => ({ type: "operation", parameters: [value, ...cases.reduce((v1: Array<any>, v2: Array<any>) => v1.concat(v2))], identifier: "switch" }) %}
SwitchCase              ->  %ws %caseSymbol %ws Step %colon ws Step                        {% ([,,,value,,,operation]) => [value, operation] %}

BasicOperation          ->  BooleanOperation                                            {% ([value]) => value %}

BooleanOperation        ->  OrOperation                                                 {% ([value]) => value %}

OrOperation             ->  OrOperation ws %or ws AndOperation                          {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "||" }) %}
                        |   AndOperation                                                {% ([value]) => value %}
AndOperation            ->  AndOperation ws %and ws NegateOperation                     {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "&&" }) %}
                        |   NegateOperation                                             {% ([value]) => value %}
NegateOperation         ->  %not ws NegateOperation                                     {% ([,,value]) => ({ type: "operation", parameters: [value], identifier: "!" }) %}
                        |   ComparisonOperation                                         {% ([value]) => value %}

ComparisonOperation     ->  EquityOperation                                             {% ([value]) => value %}

EquityOperation         ->  EqualOperation                                              {% ([value]) => value %}
                        |   UnequalOperation                                            {% ([value]) => value %}
                        |   RelationalOperation                                         {% ([value]) => value %}

EqualOperation          ->  EquityOperation ws %equal ws RelationalOperation            {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "==" }) %}
UnequalOperation        ->  EquityOperation ws %unequal ws RelationalOperation          {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "!=" }) %}

RelationalOperation     ->  SmallerOperation                                            {% ([value]) => value %}
                        |   SmallerEqualOperation                                       {% ([value]) => value %}
                        |   GreaterOperation                                            {% ([value]) => value %}
                        |   GreaterEqualOperation                                       {% ([value]) => value %}
                        |   ArithmeticOperation                                         {% ([value]) => value %}

SmallerOperation        ->  RelationalOperation ws %smaller ws ArithmeticOperation      {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "<" }) %}
SmallerEqualOperation   ->  RelationalOperation ws %smallerEqual ws ArithmeticOperation {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "<=" }) %}
GreaterOperation        ->  RelationalOperation ws %greater ws ArithmeticOperation      {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op2, op1], identifier: "<" }) %}
GreaterEqualOperation   ->  RelationalOperation ws %greaterEqual ws ArithmeticOperation {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op2, op1], identifier: "<=" }) %}

ArithmeticOperation     ->  LineOperation                                               {% ([value]) => value %}

LineOperation           ->  AddOperation                                                {% ([value]) => value %}
                        |   SubtractOperation                                           {% ([value]) => value %}
                        |   PointOperation                                              {% ([value]) => value %}

AddOperation            ->  LineOperation ws %plus ws PointOperation                    {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "+" }) %}
SubtractOperation       ->  LineOperation ws %minus ws PointOperation                   {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "-" }) %}

PointOperation          ->  MultiplyOperation                                           {% ([value]) => value %}
                        |   DivideOperation                                             {% ([value]) => value %}
                        |   ModuloOperation                                             {% ([value]) => value %}
                        |   InvertOperation                                             {% ([value]) => value %}

DivideOperation         ->  PointOperation ws %divide ws InvertOperation                {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "/" }) %}
MultiplyOperation       ->  PointOperation ws %multiply ws InvertOperation              {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "*" }) %}
ModuloOperation         ->  PointOperation ws %modulo ws InvertOperation                {% ([op1,,,,op2]) => ({ type: "operation", parameters: [op1, op2], identifier: "%" }) %}

InvertOperation         ->  %minus ws InvertOperation                                   {% ([,,value]) => ({ type: "operation", parameters: [value], identifier: "!-" }) %}
                        |   Step                                                        {% ([value]) => value %}