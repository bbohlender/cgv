import { ParsedGrammarDefinition } from "../src"

export const parsedAndUnparsedGrammarPairs: Array<{
    parsed: ParsedGrammarDefinition
    unparsed: string
}> = [
    {
        parsed: {
            a: {
                type: "parallel",
                children: [
                    {
                        type: "sequential",
                        children: [
                            {
                                type: "and",
                                children: [
                                    {
                                        type: "greater",
                                        children: [
                                            {
                                                type: "add",
                                                children: [
                                                    {
                                                        type: "invert",
                                                        children: [
                                                            {
                                                                type: "this",
                                                            },
                                                        ],
                                                    },
                                                    {
                                                        type: "multiply",
                                                        children: [
                                                            {
                                                                type: "raw",
                                                                value: 1,
                                                            },
                                                            {
                                                                type: "raw",
                                                                value: 3,
                                                            },
                                                        ],
                                                    },
                                                ],
                                            },
                                            {
                                                type: "raw",
                                                value: 2,
                                            },
                                        ],
                                    },
                                    {
                                        type: "raw",
                                        value: false,
                                    },
                                ],
                            },
                            {
                                type: "raw",
                                value: 2,
                            },
                        ],
                    },
                    {
                        type: "raw",
                        value: 2,
                    },
                ],
            },
        },
        unparsed: `a -> -this + 1 * 3 > 2 && false 2 | 2`,
    },
    {
        parsed: {
            a: {
                type: "sequential",
                children: [
                    {
                        type: "setVariable",
                        children: [
                            {
                                type: "raw",
                                value: "x",
                            },
                            {
                                type: "raw",
                                value: 11,
                            },
                        ],
                    },
                    {
                        type: "modulo",
                        children: [
                            {
                                type: "this",
                            },
                            {
                                type: "raw",
                                value: 2,
                            },
                        ],
                    },
                    {
                        type: "switch",
                        children: [
                            {
                                type: "raw",
                                value: 2,
                            },
                            {
                                type: "raw",
                                value: 0,
                            },
                            {
                                type: "if",
                                children: [
                                    {
                                        type: "bracket",
                                        children: [
                                            {
                                                type: "equal",
                                                children: [
                                                    {
                                                        type: "this",
                                                    },
                                                    {
                                                        type: "raw",
                                                        value: 0,
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                    {
                                        type: "this",
                                    },
                                    {
                                        type: "bracket",
                                        children: [
                                            {
                                                type: "multiply",
                                                children: [
                                                    {
                                                        type: "this",
                                                    },
                                                    {
                                                        type: "raw",
                                                        value: 2,
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                type: "raw",
                                value: 3,
                            },
                            {
                                type: "bracket",
                                children: [
                                    {
                                        type: "sequential",
                                        children: [
                                            {
                                                type: "getVariable",
                                                children: [
                                                    {
                                                        type: "raw",
                                                        value: "x",
                                                    },
                                                ],
                                            },
                                            {
                                                type: "return",
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        },
        unparsed: `a -> this.x = 11 this % 2 switch 2
        case 0: if (this == 0) then this else (this * 2)
        case 3: (this.x return)`,
    },
]
