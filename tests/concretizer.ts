import { expect } from "chai"
import {
    concretizeRandomDerivedIndices,
    HierarchicalParsedSteps,
    parse,
    ParsedSteps,
    serializeString,
    summarize,
} from "../src"
import { concretize, deriveRandomOutputStepIndex } from "../src"

describe("concretize grammars", () => {
    it("should capture a conrete derivation", async () => {
        const description = parse(`a --> { 50%: 1 50%: 2 } | 3`)
        const indexMap = await deriveRandomOutputStepIndex(0, description, {}, {})
        const expectedIndexMap: Array<[ParsedSteps, Array<Array<[inputIndex: string, selectedChildIndex: number]>>]> = [
            [description[0].step.children![0], [[["0", 0]], [["0", 1]]]],
        ]
        for (const [step, indices] of expectedIndexMap) {
            expect(indexMap.get(step)).to.deep.oneOf(indices)
        }
    })

    it("should concretize a conrete derivation as a description", () => {
        const description = parse(`a --> { 50%: 1 50%: 2 } | 3`)
        const indexMap: Array<[ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>]> = [
            [description[0].step.children![0], [["", 1]]],
        ]
        const indices = new Map<ParsedSteps, Array<[inputIndex: string, selectedChildIndex: number]>>(indexMap)
        expect(serializeString(concretizeRandomDerivedIndices(description, indices))).to.equal(`a --> 2 | 3`)
    })

    it("should concretize a conrete derivation as a description with id selection", () => {
        const description = parse(`a --> ( 1 | 2 ) -> { 50%: 1 50%: 2 } | 3`)
        const indexMap: Array<[ParsedSteps, Array<[string, number]>]> = [
            [
                description[0].step.children![0]!.children![1]!,
                [
                    ["0,0", 1],
                    ["0,1", 0],
                ],
            ],
        ]
        const indices = new Map<ParsedSteps, Array<[string, number]>>(indexMap)
        expect(serializeString(concretizeRandomDerivedIndices(description, indices))).to.equal(
            `a --> ( 1 | 2 ) -> switch id( ) { case "0,0": 2 case "0,1": 1 } | 3`
        )
    })

    /*it("should recreate the unstochastic input grammar", async () => {
        const text = `a --> -this + 1 * 3 > 2 && false -> 2 | 2`
        const description = parse(text)
        expect(serializeString(await concretize(0, description, {}, {}))).to.equal(text)
    })*/

    it("should recreate one of summarized grammars", async () => {
        const text1 = `s1 --> if this == 2 then { 2 } else { 2 }`
        const text2 = `s1 --> if true == false then { 1 } else { 2 }`
        const description1 = parse(text1)
        const description2 = parse(text2)
        const summarized = summarize(description1, description2)
        const result = serializeString(await concretize(0, summarized, {}, {}))
        expect(result).to.oneOf([
            `s1 --> if this == 2 then { null } else { 2 }`,
            `s1 --> if true == 2 then { null } else { 2 }`,
            `s1 --> if this == false then { null } else { 2 }`,
            `s1 --> if true == false then { null } else { 2 }`,
        ])
    })

    it("should recreate one of the possible summarized grammars randomly", async () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`b --> a | this -> 2\na --> 1`)
        const summarized = summarize(description1, description2)
        const description = await concretize(0, summarized, {}, {})
        const result = serializeString(description)
        expect(result).to.oneOf([
            `a --> a' | 2\na' --> 1`,
            `a --> a' | 3\na' --> 1`,
            `a --> 1 | 2\na' --> 1`,
            `a --> 1 | 3\na' --> 1`,
        ])
    })
})
