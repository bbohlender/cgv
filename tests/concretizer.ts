import { expect } from "chai"
import {
    concretizeRandomDerivedIndices,
    HierarchicalParsedSteps,
    parse,
    ParsedSteps,
    serializeString,
    summarize,
} from "../src"
import { concretize, deriveConcreteIndices } from "../src"

describe("concretize grammars", () => {
    it("should capture a conrete derivation", async () => {
        const description = parse(`a --> 1 | 2 -> 3`)
        const indexMap = await deriveConcreteIndices(0, description, {}, {}, () => true)
        const [v_, v0_, v1_] = [[], [0], [1]]
        const [v, v0, v1] = [v_.join(","), v0_.join(","), v1_.join(",")]
        const expectedIndexMap: Array<[ParsedSteps, Array<[string, Array<number>]>]> = [
            [
                description[0].step,
                [
                    [v, v0_],
                    [v, v1_],
                ],
            ],
            [description[0].step.children![0]!, [[v0, v0_]]],
            [description[0].step.children![1]!, [[v1, v1_]]],
            [description[0].step.children![1]!.children![0], [[v1, v1_]]],
            [description[0].step.children![1]!.children![1]!, [[v1, v1_]]],
        ]
        for (const [step, indices] of expectedIndexMap) {
            expect(indexMap.get(step)).to.deep.equal(indices)
        }
    })

    it("should concretize a conrete derivation as a description", () => {
        const [v_, v0_, v01_, v1_] = [[], [0], [0, 1], [1]]
        const [v, v0, v01, v1] = [v_.join(","), v0_.join(","), v01_.join(","), v1_.join(",")]
        const description = parse(`a --> { 50%: 1 50%: 2 } | 3`)
        const indexMap: Array<[ParsedSteps, Array<[string, Array<number>]>]> = [
            [
                description[0].step,
                [
                    [v, v0_],
                    [v, v1_],
                ],
            ],
            [description[0].step.children![0]!, [[v0, v01_]]],
            [description[0].step.children![0].children![0], [[v01, v01_]]],
            [description[0].step.children![0].children![1]!, []],
            [description[0].step.children![1]!, [[v1, v1_]]],
        ]
        const indices = new Map<ParsedSteps, Array<[string, Array<number>]>>(indexMap)
        expect(serializeString(concretizeRandomDerivedIndices(description, indices))).to.equal(
            `a --> switch id() { case 0: null case "0": 2 } | 3`
        )
    })

    it("should concretize a conrete derivation as a description with id selection", () => {
        const [v_, v0_, v00_, v01_, v1_] = [[], [0], [0, 0], [0, 1], [1]]
        const [v, v0, v00, v01, v1] = [v_.join(","), v0_.join(","), v00_.join(","), v01_.join(","), v1_.join(",")]
        const description = parse(`a --> (1 | 2) -> { 50%: 1 50%: 2 } | 3`)
        const indexMap: Array<[ParsedSteps, Array<[string, Array<number>]>]> = [
            [
                description[0].step,
                [
                    [v, v00_],
                    [v, v01_],
                    [v, v1_],
                ],
            ],
            [
                description[0].step.children![0]!,
                [
                    [v0, v00_],
                    [v0, v01_],
                ],
            ],
            [
                description[0].step.children![0]!.children![0],
                [
                    [v0, v00_],
                    [v0, v01_],
                ],
            ],
            [
                description[0].step.children![0]!.children![1]!,
                [
                    [v00, v00_],
                    [v01, v01_],
                ],
            ],
            [description[0].step.children![0].children![1]!.children![0], [[v00, v00_]]],
            [description[0].step.children![0].children![1]!.children![1]!, [[v01, v01_]]],
            [description[0].step.children![1]!, [[v1, v1_]]],
        ]
        const indices = new Map<ParsedSteps, Array<[string, Array<number>]>>(indexMap)
        expect(serializeString(concretizeRandomDerivedIndices(description, indices))).to.equal(
            `a --> (1 | 2) -> switch id() { case "0,0": 1 case "0,1": 2 } | 3`
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
        expect(serializeString(await concretize(0, summarized, {}, {}))).to.oneOf([text1, text2])
    })

    it("should recreate one of the possible summarized grammars randomly", async () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`b --> a | this -> 2\na --> 1`)
        const summarized = summarize(description1, description2)
        expect(serializeString(await concretize(0, summarized, {}, {}))).to.oneOf([
            `a --> 1 | this -> 2`,
            `a --> 1 | this -> 3`,
            `a --> b | this -> 2\nb --> 1`,
            `a --> b | this -> 3\nb --> 1`,
        ])
    })
})
