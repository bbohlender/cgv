@preprocessor typescript
@{%
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
    js: /".+?"/,
    ws: { match: /\s+/, lineBreaks: true },
});
%}
@lexer lexer

GrammarDefinition   ->  ws RuleDefinition ws                                        {% ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} }) %}
                    |   ws EventDefinition ws                                       {% ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } }) %}
                    |   ws RuleDefinition %ws GrammarDefinition                     {% ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events }) %}
                    |   ws EventDefinition %ws GrammarDefinition                    {% ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } }) %}
                    |   ws                                                          {% () => ({ rules: {}, events: {} }) %}

RuleDefinition      ->  %identifier ws %arrow ws Values                             {% ([{ value },,,,steps]) => [value, steps] %}

Values              ->  ParallelValues                                              {% ([values]) => values %}
EmptyValues         ->  ParallelValues                                              {% ([values]) => values %}
                    |   null                                                        {% () => ({ type: "raw", value: [] }) %}

ParallelValues      ->  SequentialValues ParallelValue:+                            {% ([sequential,sequentials]) => ({ type: "parallel", values: [sequential, ...sequentials] }) %}
                    |   SequentialValues                                            {% ([sequential]) => sequential %}
ParallelValue       ->  ws %parallel SequentialValues                               {% ([,,sequential]) => sequential %}

SequentialValues    ->  PrimaryValues SequentialValue:+                             {% ([primary,primaries]) => ({ type: "sequential", values: [primary, ...primaries] }) %}
                    |   PrimaryValues                                               {% ([primary]) => primary %}
SequentialValue     ->  %ws PrimaryValues                                           {% ([,primary]) => primary %}

PrimaryValues       ->  ws Value                                                    {% ([,value]) => value %}
                    |   ws %openBracket Values ws %closedBracket                    {% ([,,values]) => values %}

Value               ->  Operation                                                   {% ([operation]) => operation %}
                    |   Symbol                                                      {% ([symbol]) => symbol %}
                    |   Event                                                       {% ([event]) => event %}
                    |   JS                                                          {% ([value]) => ({ type: "raw", value }) %}
                    |   %thisSymbol                                                 {% () => ({ type: "this" }) %}

Operation           ->  %identifier ws %openBracket EmptyValues ws %closedBracket   {% ([{ value },,,parameters]) => ({ type: "operation", parameters, identifier: value }) %}
Symbol              ->  %identifier                                                 {% ([{ value }]) => ({ type: "symbol", identifier: value }) %}
Event               ->  %event %openBracket ws %identifier ws %closedBracket        {% ([,,, { value }]) => ({ type: "event", identifier: value }) %}

EventDefinition     ->  %identifier ws %equal ws JS                                 {% ([{ value },,,, fn]) => [value, fn] %}

JS                  ->  %js                                                         {% ([{ value }]) => eval((value as string).replace(/"(.+?)"/, (_,fn) => fn)) %}
ws                  ->  %ws | null