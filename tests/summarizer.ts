import { expect } from "chai"
import { Horizontal, parse, ParsedSteps, serializeString, summarize, translateNestedGroup, Vertical } from "../src"
import { align, NestedGroup, nestGroups as nestGroup } from "../src/summarizer/group"
import { linearize, LinearizedStep } from "../src/summarizer/linearize"
import { filterMap } from "../src/summarizer/filter"
import { parsedAndUnparsedGrammarPairs } from "./test-data"
import { combine, isCombineable } from "../src/summarizer/combine"

describe("align, group and combine matrices", () => {
    it("should align a compatible array", () => {
        const result = align(
            [
                [1, 2, 3, 3, 3, 4, 4, 5],
                [0, 1, 3, 3, 4],
            ],
            () => -1,
            (v1, v2) => v1 === v2
        )
        expect(result.aligned).to.deep.equal([
            [-1, 1, 2, 3, 3, 3, 4, 4, 5],
            [0, 1, -1, 3, 3, -1, 4, -1, -1],
        ])
        expect(result.merged).to.deep.equal([0, 1, 2, 3, 3, 3, 4, 4, 5])
    })

    it("should miss align a incompatible array", () => {
        const result = align(
            [
                [0, 1, 2, 3],
                [4, 5, 6, 7],
            ],
            () => -1,
            (v1, v2) => v1 === v2
        )
        expect(result.aligned).to.deep.equal([
            [0, 1, 2, 3, -1, -1, -1, -1],
            [-1, -1, -1, -1, 4, 5, 6, 7],
        ])
        expect(result.merged).to.deep.equal([0, 1, 2, 3, 4, 5, 6, 7])
    })

    it("should nest groups", () => {
        const matrix: Array<Array<number>> = [
            [1, 2, 3, 4],
            [1, 5, 5, 6],
            [7, 10, 11, 8],
            [9, 5, 5, 12],
        ]
        const nested = nestGroup(
            matrix,
            (v1, x1, y1, v2, x2, y2) => v1 === v2,
            (values) => values[0][0]
        )
        const expected: NestedGroup<number> = {
            height: 4,
            value: [
                [
                    { height: 2, value: 1 },
                    { height: 1, value: 7 },
                    { height: 1, value: 9 },
                ],
                [
                    {
                        height: 1,
                        value: [[{ height: 1, value: 2 }], [{ height: 1, value: 3 }]],
                    },
                    { height: 2, value: 5 },
                    {
                        height: 1,
                        value: [[{ height: 1, value: 10 }], [{ height: 1, value: 11 }]],
                    },
                ],
                [
                    { height: 1, value: 4 },
                    { height: 1, value: 6 },
                    { height: 1, value: 8 },
                    { height: 1, value: 12 },
                ],
            ],
        }
        expect(nested).to.deep.equal(expected)
    })

    it("should combine similar vertically", () => {
        const matrix: Array<Array<number>> = [
            [2, 4, 6, 8],
            [3, 11, 10, 12],
            [18, 20, 21, 24],
            [8, 10, 11, 16],
        ]
        const result = nestGroup(
            matrix,
            (v1, x1, y1, v2, x2, y2) => Math.floor(v1 / 2) === Math.floor(v2 / 2),
            (value) => Math.floor(value[0][0] / 2) * 2
        )
        const expected: NestedGroup<number> = {
            height: 4,
            value: [
                [
                    { height: 2, value: 2 },
                    { height: 1, value: 18 },
                    { height: 1, value: 8 },
                ],
                [
                    {
                        height: 1,
                        value: [[{ height: 1, value: 4 }], [{ height: 1, value: 6 }]],
                    },
                    { height: 2, value: 10 },
                    {
                        height: 1,
                        value: 20,
                    },
                ],
                [
                    { height: 1, value: 8 },
                    { height: 1, value: 12 },
                    { height: 1, value: 24 },
                    { height: 1, value: 16 },
                ],
            ],
        }
        expect(result).to.deep.equal(expected)
    })
})

describe("summarize grammars", () => {
    it("should replace filter", () => {
        const matrix: Vertical<Horizontal<LinearizedStep>> = [
            [
                { type: "filter-conditional", condition: { type: "raw", value: false }, value: true },
                { type: "raw", value: 0 },
                { type: "raw", value: 0 },
                { type: "raw", value: 0 },
            ],
            [
                { type: "raw", value: 2 },
                { type: "filter-conditional", condition: { type: "raw", value: true }, value: true },
                { type: "raw", value: 1 },
                { type: "raw", value: 0 },
            ],
            [
                { type: "filter-conditional", condition: { type: "raw", value: false }, value: false },
                { type: "raw", value: 0 },
                { type: "raw", value: 0 },
                { type: "raw", value: 0 },
            ],
            [
                { type: "raw", value: 0 },
                {
                    type: "filter-conditional",
                    condition: { type: "raw", value: true },
                    value: false,
                },
                { type: "raw", value: 0 },
                { type: "raw", value: 0 },
            ],
        ]
        const result = filterMap(matrix)
        expect(result).to.deep.equal([
            [1, 1, 0, 0],
            [0, 2, 2, 0],
            [1, 1, 0, 0],
            [0, 2, 2, 0],
        ])
    })

    it("should translate nested group to steps", () => {
        const input: NestedGroup<ParsedSteps> = {
            height: 4,
            value: [
                [
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                ],
                [
                    {
                        height: 1,
                        value: [
                            [{ height: 1, value: { type: "raw", value: 0 } }],
                            [{ height: 1, value: { type: "raw", value: 0 } }],
                        ],
                    },
                    {
                        height: 2,
                        value: {
                            type: "if",
                            children: [
                                { type: "raw", value: true },
                                { type: "raw", value: 1 },
                                { type: "raw", value: 0 },
                            ],
                        },
                    },
                    {
                        height: 1,
                        value: [
                            [{ height: 1, value: { type: "raw", value: 0 } }],
                            [{ height: 1, value: { type: "raw", value: 0 } }],
                        ],
                    },
                ],
                [
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                    { height: 1, value: { type: "raw", value: 0 } },
                ],
            ],
        }
        const result = translateNestedGroup(input)
        expect(serializeString([{ name: "a", step: result }])).to.deep.equal(
            `a --> ( 0 | 0 | 0 | 0 ) -> ( 0 -> 0 | if true then { 1 } else { 0 } | 0 -> 0 ) -> ( 0 | 0 | 0 | 0 )`
        )
    })

    it("should randomize aligned linearized steps", () => {
        //problem: filter?
    })

    it("should linearize and de-linearize", () => {
        for (const { unparsed } of parsedAndUnparsedGrammarPairs) {
            const step = parse(unparsed)[0].step
            const linearized = linearize(step)
            const map = filterMap(linearized)
            const nestedGroup = nestGroup<LinearizedStep, ParsedSteps>(
                linearized,
                (v1, x1, y1, v2, x2, y2) => {
                    if (map[y1][x1] != map[y2][x2]) {
                        return false
                    }
                    return isCombineable(v1, v2)
                },
                combine
            )
            expect(serializeString([{ name: "a", step: translateNestedGroup(nestedGroup) }])).to.equal(unparsed)
        }
    })

    it("should summarize at inner steps with using a random step based on the operation type and at least one equal child", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> 2 | this -> 2`)

        const result = summarize(description1, description2)

        //expect(result1).to.equal(result2)
        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: 2 } | this -> { 50%: 3 50%: 2 }`)
    })

    it("should not summarize steps with using a random step based on the operation type and at least one equal child", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> 2 | 1 -> 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a -> { 50%: 1 | this -> 3 50%: 2 | 1 -> 2 }`)
    })

    it("should summarize steps including new noun", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> this -> 2 | b\nb --> 1`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: b } | this -> { 50%: 3 50%: b }\nb -> 1`)
    })

    it("should summarize steps unodered in a ParallelStep", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`a --> this -> 2 | 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: 2 } | this -> { 50%: 3 50%: 2 }`)
    })

    it("should summarize steps in parallel with different children amount and unodered", () => {
        const description1 = parse(`a --> 1 | this -> 3 | 22`)
        const description2 = parse(`a --> this -> 2 | 2`)

        const result = summarize(description1, description2)

        expect(serializeString(result)).to.equal(
            `a --> { 50%: 1 50%: 2 } | this -> { 50%: 3 50%: 2 } | { 50%: 22 50%: null }`
        )
    })

    it("should summarize two grammars as a outer random switch even though they both start with the same operator", () => {
        const description1 = parse(`s1 --> if this == 2 then { 2 } else { 2 }`)
        const description2 = parse(`s1 --> if true == false then { 1 } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 50%: if this == 2 then { 2 } else { 2 } 50%: if true == false then { 1 } else { 2 } }`
        )
    })

    it("should summarize two grammars as a outer random switch as they are completly different", () => {
        const description1 = parse(`s1 --> this * 3 / 5`)
        const description2 = parse(`s1 --> switch this { case 0: (4 * 4) }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 50%: this * 3 / 5 50%: switch this { case 0: (4 * 4) } }`
        )
    })

    it("should summarize two grammars as multiple innter random switches", () => {
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s2 --> if this == false then { 1 } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2)
        expect(serializeString(summarizedGrammar)).to.equal(`s1 --> if this == false then { 50%: 2 50%: 1 } else { 2 }`)
    })

    it("should summarize three equal grammars as the same", () => {
        const text = `s1 --> if this == false then { switch this { case 0: 1 case 1: 0 } } else { 2 }`
        const description1 = parse(text)
        const description2 = parse(text)
        const description3 = parse(text)
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal(text)
    })

    it("should summarize two equal and one not equal grammars", () => {
        const description1 = parse("s1 --> 1")
        const description2 = parse("s2 --> 1")
        const description3 = parse("s1 --> 2")
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal("s1 --> { 66.67%: 1 33.33% 2 }")
    })

    it("should summarize multiple grammars with outer and inner switches based on their similarity", () => {
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description3 = parse(`s2 --> this == false`)
        const summarizedGrammar = summarize(description1, description2, description3)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> { 66.67%: if this == false then { 50%: 2 50%: 1 } else { 2 } 33.33%: this == false }`
        )
    })

    it("should summarize multiple grammars and calculate probability", () => {
        const description3 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description1 = parse(`s1 --> if this == false then { 2 } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const description4 = parse(`s1 --> if this == false then { 1 } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2, description3, description4)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 -> if (this == false) then { 25%: 2 75%: 1 } else { 2 }`
        )
    })

    it("should only summarize grammars with same operation identifier", () => {
        const description3 = parse(`s1 --> if this == false then { doOne(4) } else { 2 }`)
        const description1 = parse(`s1 --> if this == false then { doOne(3) } else { 2 }`)
        const description2 = parse(`s1 --> if this == false then { doTwo(3) } else { 2 }`)
        const description4 = parse(`s1 --> if this == false then { doOne(4) } else { 2 }`)
        const summarizedGrammar = summarize(description1, description2, description3, description4)
        expect(serializeString(summarizedGrammar)).to.equal(
            `s1 --> if this == false then { 25%: doOne(3) 25%: doTwo(3) 50%: doOne(4) } else { 2 }`
        )
    })
})
