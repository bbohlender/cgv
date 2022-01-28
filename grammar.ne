@preprocessor typescript
@{%
import moo from "moo";

const lexer = moo.compile({
    arrow: /->/,
    openBracket: /\(/,
    closedBracket: /\)/,
    parallel: /\|/,
    comma: /,/,
    thisSymbol: /this/,
    identifier: /[A-Za-z\d]+/,
    js: { match: /"[^"]+"/, lineBreaks: true },
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

PrimarySteps        ->  ws Step                                                     {% ([,step]) => step %}
                    |   ws %openBracket Steps ws %closedBracket                     {% ([,,steps]) => steps %}

Step                ->  Operation                                                   {% ([operation]) => operation %}
                    |   Symbol                                                      {% ([symbol]) => symbol %}
                    |   JS                                                          {% ([value]) => ({ type: "raw", value }) %}
                    |   %thisSymbol                                                 {% () => ({ type: "this" }) %}

Operation           ->  %identifier ws %openBracket Parameters ws %closedBracket    {% ([{ value },,,parameters]) => ({ type: "operation", parameters, identifier: value }) %}

EmptyParameters     ->  Parameters                                                  {% ([parameters]) =>  parameters%}
                    |   null                                                        {% () => [] %}
Parameters          ->  Steps Parameter:+                                           {% ([steps, stepsList]) => [steps, ...stepsList] %}
                    |   Steps                                                       {% ([steps]) => [steps] %}
Parameter           ->  ws %comma Steps                                             {% ([,,steps]) =>  steps %}

Symbol              ->  %identifier                                                 {% ([{ value }]) => ({ type: "symbol", identifier: value }) %}

JS                  ->  %js                                                         {% ([{ value }]) => eval((value as string).replace(/"([^"]+)"/, (_,fn) => fn)) %}
ws                  ->  %ws | null