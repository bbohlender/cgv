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
    js: { match: /"[^"]+"/, lineBreaks: true },
    ws: { match: /\s+/, lineBreaks: true },
});
%}
@lexer lexer

GrammarDefinition   ->  ws RuleDefinition ws                                        {% ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} }) %}
                    |   ws EventDefinition ws                                       {% ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } }) %}
                    |   ws RuleDefinition %ws GrammarDefinition                     {% ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events }) %}
                    |   ws EventDefinition %ws GrammarDefinition                    {% ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } }) %}
                    |   ws                                                          {% () => ({ rules: {}, events: {} }) %}

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

PrimarySteps        ->  ws Step                                                     {% ([,step]) => step %}
                    |   ws %openBracket Steps ws %closedBracket                     {% ([,,steps]) => steps %}

Step                ->  Operation                                                   {% ([operation]) => operation %}
                    |   Symbol                                                      {% ([symbol]) => symbol %}
                    |   Event                                                       {% ([event]) => event %}
                    |   JS                                                          {% ([value]) => ({ type: "raw", value }) %}
                    |   %thisSymbol                                                 {% () => ({ type: "this" }) %}

Operation           ->  %identifier ws %openBracket EmptySteps ws %closedBracket    {% ([{ value },,,parameters]) => ({ type: "operation", parameters, identifier: value }) %}
Symbol              ->  %identifier                                                 {% ([{ value }]) => ({ type: "symbol", identifier: value }) %}
Event               ->  %event %openBracket ws %identifier ws %closedBracket        {% ([,,, { value }]) => ({ type: "event", identifier: value }) %}

EventDefinition     ->  %identifier ws %equal ws JS                                 {% ([{ value },,,, fn]) => [value, fn] %}

JS                  ->  %js                                                         {% ([{ value }]) => eval((value as string).replace(/"([^"]+)"/, (_,fn) => fn)) %}
ws                  ->  %ws | null