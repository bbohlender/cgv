@preprocessor typescript
@{%
import moo from "moo";

const lexer = moo.compile({
    arrow: /->/,
    equal: /=/,
    openBracket: /\(/,
    closedBracket: /\)/,
    parrallel: /\|/,
    event: /event/,
    identifier: /[A-Za-z]+/,
    js: /".+?"/,
    ws: { match: /\s+/, lineBreaks: true },
});
%}
@lexer lexer

Grammar     ->  ws Rule ws                  {% ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} }) %}
            |   ws Event ws                 {% ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } }) %}
            |   ws Rule %ws Grammar         {% ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events }) %}
            |   ws Event %ws Grammar        {% ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } }) %}
            |   ws                          {% () => ({ rules: {}, events: {} }) %}

Rule        ->  %identifier ws %arrow ws RuleSteps {% ([{ value },,,, steps]) => [value.trim(), steps] %}

RuleSteps   ->  ws Value                 {% (val) => [val[1]] %}
            |   ws Value %ws RuleSteps   {% (val) => [val[1], ...val[3]] %}

Value       ->  Operation               {% ([operation]) => operation %}
            |   Symbol                  {% ([symbol]) => symbol %}
            |   Event                   {% ([event]) => event %}
            |   JS                      {% ([value]) => ({ type: "js", value }) %}

Operation   ->  %identifier ws %openBracket ws %closedBracket {% ([{ value }]) => ({ type: "operation", identifier: value.trim() }) %}
Symbol      ->  %identifier {% ([{ value }]) => ({ type: "symbol", identifier: value.trim() }) %}
Event       ->  %event %openBracket ws %identifier ws %closedBracket {% ([,,, { value }]) => ({ type: "event", identifier: value.trim() }) %}

Event       ->  %identifier ws %equal ws JS {% ([{ value },,,, fn]) => [value.trim(), fn] %}

JS          ->  %js {% ([{ value }]) => eval((value as string).replace(/"(.+?)"/, (_,fn) => fn)) %}

ws          ->  %ws | null