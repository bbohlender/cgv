@preprocessor typescript
@builtin "number.ne"
expression  ->  operation {% ([result]) => result %}
            |   decimal {% ([result]) => result %}
operation   ->  expression ("+" | "-" | "*" | "/") decimal {%
                    function([left, [op], right]) {
                        switch(op) {
                            case "+":
                                return left + right
                            case "-":
                                return left - right
                            case "*":
                                return left * right
                            case "/":
                                return left / right
                        }
                    }
                %}
