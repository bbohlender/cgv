@preprocessor typescript
@{%
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
%}
@lexer lexer

Grammar ->  ws Rule ws                  {% ([,[identifier, steps]]) => ({ rules: { [identifier]: steps }, events: {} }) %}
        |   ws Event ws                 {% ([,[identifier, fn]]) => ({ rules: {}, events: { [identifier]: fn } }) %}
        |   ws Rule %ws Grammar         {% ([,[identifier, steps],,prev]) => ({ rules: { [identifier]: steps, ...prev.rules }, events: prev.events }) %}
        |   ws Event %ws Grammar        {% ([,[identifier, fn],,prev]) => ({ rules: prev.rules, events: { [identifier]: fn, ...prev.events } }) %}
        |   ws                          {% () => ({ rules: {}, events: {} }) %}

Rule        ->  %identifier ws %arrow ws RuleSteps {% ([{ value },,,, steps]) => [value.trim(), steps] %}

RuleSteps   ->  ws RuleStep                 {% (val) => [val[1]] %}
            |   ws RuleStep %ws RuleSteps   {% (val) => [val[1], ...val[3]] %}

RuleStep    ->  RuleOperation               {% ([operation]) => operation %}
            |   RuleSymbol                  {% ([symbol]) => symbol %}
            |   RuleEvent                   {% ([event]) => event %}

Event       ->  %identifier ws %equal ws JS {% ([{ value },,,, fn]) => [value.trim(), fn] %}

RuleOperation   ->  %identifier ws %openBracket ws %closedBracket {% ([{ value }]) => ({ type: "operation", identifier: value.trim() }) %}
RuleSymbol      ->  %identifier {% ([{ value }]) => ({ type: "symbol", identifier: value.trim() }) %}
RuleEvent       ->  %event %openBracket ws %identifier ws %closedBracket {% ([,,, { value }]) => ({ type: "event", identifier: value.trim() }) %}

JS          ->  %js {% ([{ value }]) => eval((value as string).replace(/"(.+?)"/, (_,fn) => fn)) %}

ws          ->  %ws | null