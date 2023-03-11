import { expect } from "chai"
import { EPSILON, parse, ParsedTransformation, serializeString, summarize, Vertical } from "../src"
import { abstractNestVerticalGroups } from "../src/summarizer/abstract-nest-vertical"
import { align, NestedGroup, NestGroupConfig, nestGroups, Row } from "../src/summarizer/group"
import { linearize, LinearizedRow, LinearizedStep } from "../src/summarizer/linearize"
import { stepSimilarity } from "../src/summarizer/step-similarity"
import { translateNestedGroup } from "../src/summarizer/translate-nested"
import { parsedAndUnparsedGrammarPairs } from "./test-data"

function rowSimilarity<T>(
    valueSimilarity: (v1: T, v2: T) => number,
    minValueSimilarity: number,
    rows: Array<Row<T>>,
    rowsCombineableMatrix: Array<Array<boolean>>,
    config: NestGroupConfig<T, any, unknown>,
    probability: number,
    xStart: number,
    xEnd: number,
    y1: number,
    y2: number
): number {
    let similarity = 0
    let length = 0
    for (let x = xStart; x < xEnd; x++) {
        const v1 = rows[y1].horizontal[x]
        const v2 = rows[y2].horizontal[x]

        if (!config.filterValue(v1) && !config.filterValue(v2)) {
            continue
        }
        ++length
        if (valueSimilarity(v1, v2) >= minValueSimilarity) {
            similarity++
        }
    }

    if (length === 0) {
        similarity = 1 //only "this" is very similar
    } else {
        similarity /= length
    }

    if (!rowsCombineableMatrix[y1][y2]) {
        similarity = -3 //similarity can now only be between -3 and -2 => which should be smaller then minRowSimilarity => leads to a horizontal split until no incompatibilities left
    } else if ((rows[y1].probability + rows[y2].probability) * probability > 1 + EPSILON) {
        similarity = -1.5 //same for here only that the range is in between -1.5 and -0.5
    }

    return similarity
}

describe("align, group and combine matrices", () => {
    it("should align a compatible array", () => {
        const result = align(
            [
                { probability: 1, horizontal: [1, 2, 3, 3, 3, 4, 4, 5] },
                { probability: 1, horizontal: [0, 1, 3, 3, 4] },
            ],
            () => -1,
            (v1, v2) => v1 === v2
        )
        expect(result).to.deep.equal([
            { probability: 1, horizontal: [-1, 1, 2, 3, 3, 3, 4, 4, 5] },
            { probability: 1, horizontal: [0, 1, -1, 3, 3, -1, 4, -1, -1] },
        ])
    })

    it("should miss align a incompatible array", () => {
        const result = align(
            [
                { probability: 1, horizontal: [0, 1, 2, 3] },
                { probability: 1, horizontal: [4, 5, 6, 7] },
            ],
            () => -1,
            (v1, v2) => v1 === v2
        )
        expect(result).to.deep.equal([
            { probability: 1, horizontal: [0, 1, 2, 3, -1, -1, -1, -1] },
            { probability: 1, horizontal: [-1, -1, -1, -1, 4, 5, 6, 7] },
        ])
    })

    it("should nest groups", () => {
        const config: NestGroupConfig<number, number, unknown> = {
            nestVerticalGroups: (rows, rowsCombineableMatrix, config, xStart, xEnd, yList, probability) =>
                abstractNestVerticalGroups(
                    rows,
                    rowsCombineableMatrix,
                    (config, [{ value }]) => value,
                    (v1, v2) => (v1 === v2 ? 1 : 0),
                    0.3,
                    config,
                    xStart,
                    xEnd,
                    yList,
                    probability
                ),
            filterValue: (val) => val != 4,
            minRowSimilarity: 0.3,
            rowSimilarity: (...params) => rowSimilarity((v1, v2) => (v1 === v2 ? 1 : 0), 0.3, ...params),
        }
        const result = nestGroups(
            [
                { horizontal: [1, 2, 3, 4], probability: 0.25 },
                { horizontal: [1, 5, 5, 6], probability: 0.25 },
                { horizontal: [7, 10, 11, 8], probability: 0.25 },
                { horizontal: [9, 5, 5, 12], probability: 0.25 },
            ],
            //don't combine row 1 & 2 even if possible
            [
                [true, false, true, true],
                [false, true, true, true],
                [true, true, true, true],
                [true, true, true, true],
            ],
            config
        )
        const expected: NestedGroup<number> = [
            {
                vertical: [
                    {
                        group: [
                            {
                                vertical: [
                                    {
                                        group: [
                                            { vertical: [{ group: 1, probability: 1 }], compatible: true },
                                            { vertical: [{ group: 2, probability: 1 }], compatible: true },
                                            { vertical: [{ group: 3, probability: 1 }], compatible: true },
                                        ],
                                        probability: 0.5,
                                    },
                                    {
                                        group: [
                                            { vertical: [{ group: 7, probability: 1 }], compatible: true },
                                            { vertical: [{ group: 10, probability: 1 }], compatible: true },
                                            { vertical: [{ group: 11, probability: 1 }], compatible: true },
                                            { vertical: [{ group: 8, probability: 1 }], compatible: true },
                                        ],
                                        probability: 0.5,
                                    },
                                ],
                                compatible: true,
                            },
                        ],
                        probability: 0.5,
                    },
                    {
                        group: [
                            {
                                vertical: [
                                    { group: 1, probability: 0.5 },
                                    { group: 9, probability: 0.5 },
                                ],
                                compatible: true,
                            },
                            { vertical: [{ group: 5, probability: 1 }], compatible: true },
                            { vertical: [{ group: 5, probability: 1 }], compatible: true },
                            {
                                vertical: [
                                    { group: 6, probability: 0.5 },
                                    { group: 12, probability: 0.5 },
                                ],
                                compatible: true,
                            },
                        ],
                        probability: 0.5,
                    },
                ],
                compatible: false,
            },
        ]
        expect(result).to.deep.equal(expected)
    })

    it("should combine similar vertically", () => {
        const config: NestGroupConfig<number, number, unknown> = {
            nestVerticalGroups: (rows, rowsCombineableMatrix, config, xStart, xEnd, yList, probability) =>
                abstractNestVerticalGroups(
                    rows,
                    rowsCombineableMatrix,
                    (config, [{ value }]) => Math.floor(value / 2) * 2,
                    (v1, v2) => (Math.floor(v1 / 2) === Math.floor(v2 / 2) ? 1 : 0),
                    0.3,
                    config,
                    xStart,
                    xEnd,
                    yList,
                    probability
                ),
            filterValue: (val) => val != 8,
            rowSimilarity: (...params) =>
                rowSimilarity((v1, v2) => (Math.floor(v1 / 2) === Math.floor(v2 / 2) ? 1 : 0), 0.3, ...params),
            minRowSimilarity: 0.3,
        }
        const result = nestGroups(
            [
                { horizontal: [2, 4, 6, 8], probability: 0.5 },
                { horizontal: [3, 11, 10, 12], probability: 0.5 },
                { horizontal: [18, 20, 21, 24], probability: 0.5 },
                { horizontal: [8, 10, 11, 16], probability: 0.5 },
            ],
            [
                [true, true, true, true],
                [true, true, true, true],
                [true, true, true, true],
                [true, true, true, true],
            ],
            config
        )
        const expected: NestedGroup<number> = [
            {
                vertical: [
                    {
                        group: [
                            { vertical: [{ group: 2, probability: 1 }], compatible: true },
                            { vertical: [{ group: 4, probability: 1 }], compatible: true },
                            { vertical: [{ group: 6, probability: 1 }], compatible: true },
                        ],
                        probability: 0.5,
                    },
                    {
                        group: [
                            {
                                vertical: [
                                    { group: 2, probability: 0.5 },
                                    { group: [], probability: 0.5 },
                                ],
                                compatible: true,
                            },
                            { vertical: [{ group: 10, probability: 1 }], compatible: true },
                            { vertical: [{ group: 10, probability: 1 }], compatible: true },
                            {
                                vertical: [
                                    { group: 12, probability: 0.5 },
                                    { group: 16, probability: 0.5 },
                                ],
                                compatible: true,
                            },
                        ],
                        probability: 1,
                    },
                    {
                        group: [
                            { vertical: [{ group: 18, probability: 1 }], compatible: true },
                            { vertical: [{ group: 20, probability: 1 }], compatible: true },
                            { vertical: [{ group: 20, probability: 1 }], compatible: true },
                            { vertical: [{ group: 24, probability: 1 }], compatible: true },
                        ],
                        probability: 0.5,
                    },
                ],
                compatible: true,
            },
        ]
        expect(result).to.deep.equal(expected)
    })
})

describe("linearize steps", () => {
    it("should linearize sequential steps", () => {
        const s = parse(`a --> 1 -> 2 | 3`)[0].step
        const expected: Vertical<LinearizedRow> = [
            {
                horizontal: [
                    { type: "raw", value: 1 },
                    { type: "raw", value: 2 },
                ],
                probability: 1,
            },
            { horizontal: [{ type: "raw", value: 3 }], probability: 1 },
        ]
        const { seperationMatrix, vertical } = linearize(
            s,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1
        )
        expect(vertical).to.deep.equal(expected)
        expect(seperationMatrix).to.deep.equal([
            [true, false],
            [false, true],
        ])
    })

    it("should linearize conditional", () => {
        const s = parse(`a --> if true then { 1 -> 3 } else { 2 }`)[0].step
        const expected: Vertical<LinearizedRow> = [
            {
                horizontal: [
                    {
                        type: "filterStart",
                        children: [
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ horizontal: [{ type: "raw", value: true }], probability: 1 }],
                            },
                        ],
                        options: 2,
                        values: [true],
                    },
                    { type: "raw", value: 1 },
                    { type: "raw", value: 3 },
                    { type: "filterEnd" },
                ],
                probability: 0.5,
            },
            {
                horizontal: [
                    {
                        type: "filterStart",
                        children: [
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ horizontal: [{ type: "raw", value: true }], probability: 1 }],
                            },
                        ],
                        options: 2,
                        values: [false],
                    },
                    { type: "raw", value: 2 },
                    { type: "filterEnd" },
                ],
                probability: 0.5,
            },
        ]
        const { seperationMatrix, vertical } = linearize(
            s,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1
        )
        expect(vertical).to.deep.equal(expected)
        expect(seperationMatrix).to.deep.equal([
            [true, true],
            [true, true],
        ])
    })

    it("should linearize sequential", () => {
        const s = parse(`a --> { 50%: 1 50%: 2 } -> (1 | 2)`)[0].step
        const expected: Vertical<LinearizedRow> = [
            {
                horizontal: [
                    { type: "raw", value: 1 },
                    { type: "raw", value: 1 },
                ],
                probability: 0.5,
            },
            {
                horizontal: [
                    { type: "raw", value: 1 },
                    { type: "raw", value: 2 },
                ],
                probability: 0.5,
            },
            {
                horizontal: [
                    { type: "raw", value: 2 },
                    { type: "raw", value: 1 },
                ],
                probability: 0.5,
            },
            {
                horizontal: [
                    { type: "raw", value: 2 },
                    { type: "raw", value: 2 },
                ],
                probability: 0.5,
            },
        ]
        const { seperationMatrix, vertical } = linearize(
            s,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1
        )
        expect(vertical).to.deep.equal(expected)
        expect(seperationMatrix).to.deep.equal([
            [true, false, true, false],
            [false, true, false, true],
            [true, false, true, false],
            [false, true, false, true],
        ])
    })

    it("should linearize complex", () => {
        const s = parse(`a --> { 50%: this * 3 / 5 50%: switch this { case 0: (4 * 4) } }`)[0].step
        const expected: Vertical<LinearizedRow> = [
            {
                probability: 0.5,
                horizontal: [
                    {
                        type: "divide",
                        children: [
                            {
                                seperationMatrix: [[true]],
                                vertical: [
                                    {
                                        probability: 1,
                                        horizontal: [
                                            {
                                                type: "multiply",
                                                children: [
                                                    {
                                                        seperationMatrix: [[true]],
                                                        vertical: [{ probability: 1, horizontal: [{ type: "this" }] }],
                                                    },
                                                    {
                                                        seperationMatrix: [[true]],
                                                        vertical: [
                                                            { probability: 1, horizontal: [{ type: "raw", value: 3 }] },
                                                        ],
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ probability: 1, horizontal: [{ type: "raw", value: 5 }] }],
                            },
                        ],
                    },
                ],
            },
            {
                horizontal: [
                    {
                        type: "filterStart",
                        children: [
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ horizontal: [{ type: "this" }], probability: 1 }],
                            },
                        ],
                        options: 1,
                        values: [0],
                    },
                    {
                        type: "multiply",
                        children: [
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ probability: 1, horizontal: [{ type: "raw", value: 4 }] }],
                            },
                            {
                                seperationMatrix: [[true]],
                                vertical: [{ probability: 1, horizontal: [{ type: "raw", value: 4 }] }],
                            },
                        ],
                    },
                    {
                        type: "filterEnd",
                    },
                ],
                probability: 0.5,
            },
        ]
        const result = linearize(
            s,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1
        ).vertical
        expect(result).to.deep.equal(expected)
    })
})

describe("summarize grammars", () => {
    it("should linearize and align", () => {
        const s1 = parse(`a --> 1 -> 2 | 3`)[0].step
        const s2 = parse(`a --> 1 | 2 | 3`)[0].step
        const s3 = parse(`a --> { 50%: 2 50%: 3 }`)[0].step

        const l1 = linearize(
            s1,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1 / 3
        )
        const l2 = linearize(
            s2,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1 / 3
        )
        const l3 = linearize(
            s3,
            (identifier) => {
                throw new Error(`unknown noun "${identifier}"`)
            },
            1 / 3
        )

        const rows = [...l1.vertical, ...l2.vertical, ...l3.vertical]
        const grid = align<LinearizedStep>(
            rows,
            () => ({ type: "this" }),
            (s1, s2) => stepSimilarity(s1, s2) > 0.3
        )

        const expected: Vertical<LinearizedRow> = [
            {
                probability: 1 / 3,
                horizontal: [{ type: "raw", value: 1 }, { type: "raw", value: 2 }, { type: "this" }],
            },
            { probability: 1 / 3, horizontal: [{ type: "this" }, { type: "this" }, { type: "raw", value: 3 }] },
            { probability: 1 / 3, horizontal: [{ type: "raw", value: 1 }, { type: "this" }, { type: "this" }] },
            { probability: 1 / 3, horizontal: [{ type: "this" }, { type: "raw", value: 2 }, { type: "this" }] },
            { probability: 1 / 3, horizontal: [{ type: "this" }, { type: "this" }, { type: "raw", value: 3 }] },
            { probability: 1 / 6, horizontal: [{ type: "this" }, { type: "raw", value: 2 }, { type: "this" }] },
            { probability: 1 / 6, horizontal: [{ type: "this" }, { type: "this" }, { type: "raw", value: 3 }] },
        ]

        expect(grid).to.deep.equal(expected)
    })

    it("should translate compatible nested group to parallel and random steps", () => {
        const input: NestedGroup<ParsedTransformation> = [
            {
                compatible: true,
                vertical: [
                    { probability: 0.5, group: { type: "raw", value: 1 } },
                    { probability: 1, group: { type: "raw", value: 2 } },
                    { probability: 0.5, group: { type: "raw", value: 3 } },
                ],
            },
        ]
        const result = translateNestedGroup(input)
        expect(serializeString([{ name: "a", step: result }])).to.deep.equal(`a --> { 50%: 1 50%: 3 } | 2`)
    })

    it("should translate nested group to steps", () => {
        const input: NestedGroup<ParsedTransformation> = [
            {
                compatible: false,
                vertical: [
                    {
                        probability: 1,
                        group: [
                            {
                                compatible: true,
                                vertical: [
                                    { group: { type: "raw", value: 1 }, probability: 0.5 },
                                    { group: { type: "raw", value: 2 }, probability: 0.5 },
                                ],
                            },
                        ],
                    },
                    {
                        probability: 1,
                        group: [
                            {
                                compatible: false,
                                vertical: [
                                    { group: { type: "raw", value: 3 }, probability: 0.5 },
                                    { group: { type: "raw", value: 4 }, probability: 0.5 },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                compatible: false,
                vertical: [
                    {
                        probability: 1,
                        group: [
                            { compatible: true, vertical: [{ probability: 1, group: { type: "raw", value: 0 } }] },
                            { compatible: true, vertical: [{ probability: 1, group: { type: "raw", value: 0 } }] },
                        ],
                    },
                    {
                        probability: 1,
                        group: {
                            type: "if",
                            children: [
                                { type: "raw", value: true },
                                { type: "raw", value: 1 },
                                { type: "raw", value: 0 },
                            ],
                        },
                    },
                    {
                        probability: 1,
                        group: [
                            { compatible: true, vertical: [{ probability: 1, group: { type: "raw", value: 0 } }] },
                            { compatible: true, vertical: [{ probability: 1, group: { type: "raw", value: 0 } }] },
                        ],
                    },
                ],
            },
            {
                compatible: false,
                vertical: [
                    { probability: 1, group: { type: "raw", value: 0 } },
                    { probability: 1, group: { type: "raw", value: 0 } },
                    { probability: 1, group: { type: "raw", value: 0 } },
                    { probability: 1, group: { type: "raw", value: 0 } },
                ],
            },
        ]
        const result = translateNestedGroup(input)
        expect(serializeString([{ name: "a", step: result }])).to.deep.equal(
            `a --> ( { 50%: 1 50%: 2 } | { 50%: 3 } | { 50%: 4 } ) -> ( 0 -> 0 | if true then { 1 } else { 0 } | 0 -> 0 ) -> ( 0 | 0 | 0 | 0 )`
        )
    })

    it("should summarize a description to itself", () => {
        for (const { unparsed, parsed } of parsedAndUnparsedGrammarPairs) {
            expect(serializeString(summarize(parsed))).to.equal(unparsed)
        }
    })

    it("should summarize at inner steps with using a random step based on the operation type and at least one equal child", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> 2 | this -> 2`)

        const result = summarize(description1, description2)

        //expect(result1).to.equal(result2)
        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: 2 } | { 50%: 3 50%: 2 }`)
    })

    it("should not summarize steps with using a random step based on the operation type and at least one equal child", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> 2 | 1 -> 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> 1 -> { 50%: this 50%: 2 } | { 50%: 3 50%: 2 }`)
    })

    it("should summarize steps including new noun", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> this -> 2 | b\nb --> 1`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> b | { 50%: 3 50%: 2 }\nb --> 1`)
    })

    it("should summarize steps unodered in a ParallelStep", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> this -> 2 | 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: 2 } | { 50%: 3 50%: 2 }`)
    })

    it("should summarize steps in parallel with different children amount and unodered", () => {
        const description1 = parse(`a --> 1 | this -> 3 | 22`)
        const description2 = parse(`a --> this -> 2 | 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: 2 } | { 50%: 22 } | { 50%: 3 50%: 2 }`)
    })

    it("should summarize two grammars as a outer random switch even though they both start with the same operator (can be improved)", () => {
        const description1 = parse(`s1 --> if this == 2 then { 2 } else { 3 }`)
        const description2 = parse(`s1 --> if true == false then { 4 } else { 5 }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if { 50%: this 50%: true } == { 50%: 2 50%: false } then { { 50%: 2 50%: 4 } } else { { 50%: 3 50%: 5 } }`
        )
    })

    it("should summarize two grammars as a outer random switch as they are completly different", () => {
        const description1 = parse(`s1 --> this * 3 / 5`)
        const description2 = parse(`s1 --> switch this { case 0: (4 * 4) }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 50%: this * 3 / 5 50%: switch this { case 0: 4 * 4 } }`
        )
    })

    it("should summarize two grammars as multiple innter random switches", () => {
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s2 --> if this == false then { 1 } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if this == false then { { 50%: 2 50%: 1 } } else { 2 }`
        )
    })

    it("should summarize three equal grammars as the same", () => {
        const text = `s1 --> if this == false then { switch this { case 0: 1 case 1: 0 } } else { 2 }`
        const description1 = parse(text)
        const description2 = parse(text)
        const description3 = parse(text)
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if this == false then { switch this { case 0: 1 case 1: 0 } } else { 2 }`
        )
    })

    it("should summarize two equal and one not equal grammars", () => {
        const description1 = parse("s1 --> 1")
        const description2 = parse("s2 --> 1")
        const description3 = parse("s1 --> 2")
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal("s1 --> { 66.67%: 1 33.33%: 2 }")
    })

    it("should summarize multiple grammars with outer and inner switches based on their similarity", () => {
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description3 = parse(`s2 --> this == false`)
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 66.67%: if this == false then { { 50%: 2 50%: 1 } } else { 2 } 33.33%: this == false }`
        )
    })

    it("should summarize multiple grammars and calculate probability", () => {
        const description3 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description4 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2, description3, description4)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if this == false then { { 25%: 2 75%: 1 } } else { 2 }`
        )
    })

    it("should summarize grammars with same operation identifier", () => {
        const description3 = parse(`s1 --> 2 -> doOne(4, 2)`)
        const description1 = parse(`s1 --> doOne(3)`)
        const description2 = parse(`s1 --> 2 -> doOne(3, 1)`)
        const description4 = parse(`s1 --> doOne(3)`)
        const summarizedGrammar = summarize(description1, description2, description3, description4)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 50%: this 50%: 2 } -> doOne( { 75%: 3 25%: 4 }, { 25%: 1 25%: 2 } )`
        )
    })

    it("should only summarize complex grammars with same operation identifier", () => {
        const description3 = parse(`s1 --> if this == false then { doOne(4) } else { 2 }`)
        const description1 = parse(`s1 --> if this == false then { doOne(3) } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { doTwo(3) } else { 2 }`)
        const description4 = parse(`s1 --> if this == false then { doOne(4) } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2, description3, description4)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if this == false then { { 75%: doOne( { 33.33%: 3 66.67%: 4 } ) 25%: doTwo( 3 ) } } else { 2 }`
        )
    })
})
