import { ParsedGrammarDefinition } from "../src"

export const parsedAndUnparsedGrammarPairs: Array<{
    parsed: ParsedGrammarDefinition
    unparsed: string
}> = [
    {
        parsed: [
            {
                name: "a",
                step: {
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
        ],
        unparsed: `a -> -this + 1 * 3 > 2 && false -> 2 | 2`,
    },
    {
        parsed: [
            {
                name: "a",
                step: {
                    type: "sequential",
                    children: [
                        {
                            type: "setVariable",
                            identifier: "x",
                            children: [
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
                            cases: [0, 3],
                            children: [
                                {
                                    type: "raw",
                                    value: 2,
                                },
                                {
                                    type: "if",
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
                                        {
                                            type: "this",
                                        },
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
                                {
                                    type: "sequential",
                                    children: [
                                        {
                                            type: "getVariable",
                                            identifier: "x",
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
            },
        ],
        unparsed: `a -> this.x = 11 -> this % 2 -> switch 2 {
            case 0: if this == 0 then { this } else { this * 2 }
            case 3: this.x -> return
        }`,
    },
    {
        parsed: [
            {
                name: "a",
                step: {
                    type: "random",
                    probabilities: [0.4, 0.6],
                    children: [
                        {
                            type: "raw",
                            value: 1,
                        },
                        {
                            type: "multiply",
                            children: [
                                {
                                    type: "raw",
                                    value: 2,
                                },
                                {
                                    type: "raw",
                                    value: 3,
                                },
                            ],
                        },
                    ],
                },
            },
        ],
        unparsed: `a -> { 40%: 1 60%: 2 * 3 }`,
    },
]
