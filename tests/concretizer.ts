import { expect } from "chai"
import {
    concretizeDerivedIndices,
    FullValue,
    HierarchicalParsedSteps,
    parse,
    ParsedSteps,
    serializeString,
    summarize,
    toHierarchical,
} from "../src"
import { concretize, deriveConcreteIndices } from "../src"
import { mockValue } from "./editor"

describe("concretize grammars", () => {
    it("should capture a conrete derivation", () => {
        const description = toHierarchical(parse(`a --> 1 | 2 -> 3`))
        const indexMap = deriveConcreteIndices(description, {})
        const [v, v0, v1] = [mockValue([]), mockValue([0]), mockValue([1])]
        const expectedIndexMap: Array<[ParsedSteps, Array<FullValue>]> = [
            [
                description[0].step,
                [
                    { before: v, after: v0 },
                    { before: v, after: v1 },
                ],
            ],
            [description[0].step.children![0]!, [{ before: v0, after: v0 }]],
            [description[0].step.children![1]!, [{ before: v1, after: v1 }]],
            [description[0].step.children![1]!.children![0], [{ before: v1, after: v1 }]],
            [description[0].step.children![1]!.children![1]!, [{ before: v1, after: v1 }]],
        ]
        expect(Array.from(indexMap.entries())).to.deep.equal(expectedIndexMap)
    })

    it("should concretize a conrete derivation as a description", () => {
        const [v, v0, v1] = [mockValue([]), mockValue([0]), mockValue([1])]
        const description = toHierarchical(parse(`a --> { 50%: 1 50%: 2 } | 3`))
        const indexMap: Array<[HierarchicalParsedSteps, Array<FullValue>]> = [
            [
                description[0].step,
                [
                    { before: v, after: v0 },
                    { before: v, after: v1 },
                ],
            ],
            [description[0].step.children![0]!, [{ before: v0, after: v0 }]],
            [description[0].step.children![0].children![0], [{ before: v0, after: v0 }]],
            [description[0].step.children![0].children![1]!, []],
            [description[0].step.children![1]!, [{ before: v1, after: v1 }]],
        ]
        const indices = new Map<HierarchicalParsedSteps, Array<FullValue>>(indexMap)
        expect(serializeString(concretizeDerivedIndices(indices))).to.equal(`a -> 2 | 3`)
    })

    it("should concretize a conrete derivation as a description with id selection", () => {
        const [v, v0, v00, v01, v1] = [
            mockValue([]),
            mockValue([0]),
            mockValue([0, 0]),
            mockValue([0, 1]),
            mockValue([1]),
        ]
        const description = toHierarchical(parse(`a --> (1 | 2) -> { 50%: 1 50%: 2 } | 3`))
        const indexMap: Array<[HierarchicalParsedSteps, Array<FullValue>]> = [
            [
                description[0].step,
                [
                    { before: v, after: v00 },
                    { before: v, after: v01 },
                    { before: v, after: v1 },
                ],
            ],
            [
                description[0].step.children![0]!,
                [
                    { before: v0, after: v00 },
                    { before: v0, after: v01 },
                ],
            ],
            [
                description[0].step.children![0]!.children![0],
                [
                    { before: v0, after: v00 },
                    { before: v0, after: v01 },
                ],
            ],
            [
                description[0].step.children![0]!.children![1]!,
                [
                    { before: v00, after: v00 },
                    { before: v01, after: v01 },
                ],
            ],
            [description[0].step.children![0].children![1]!.children![0], [{ before: v00, after: v00 }]],
            [description[0].step.children![0].children![1]!.children![1]!, [{ before: v01, after: v01 }]],
            [description[0].step.children![1]!, [{ before: v1, after: v1 }]],
        ]
        const indices = new Map<HierarchicalParsedSteps, Array<FullValue>>(indexMap)
        expect(serializeString(concretizeDerivedIndices(indices))).to.equal(
            `a --> (1 | 2) -> if(id == "0,0") then { 1 } else { 2 } | 3`
        )
    })

    it("should recreate the unstochastic input grammar", () => {
        const text = `a --> -this + 1 * 3 > 2 && false -> 2 | 2`
        const description = toHierarchical(parse(text))
        expect(serializeString(concretize(description, {}))).to.equal(text)
    })

    it("should recreate one of summarized grammars", () => {
        const text1 = `s1 --> if this == 2 then { 2 } else { 2 }`
        const text2 = `s1 --> if true == false then { 1 } else { 2 }`
        const description1 = parse(text1)
        const description2 = parse(text2)
        const summarized = toHierarchical(summarize(description1, description2))
        expect(serializeString(concretize(summarized, {}))).to.oneOf([text1, text2])
    })

    it("should recreate one of the possible summarized grammars randomly", () => {
        const description1 = parse(`a --> 1 | this -> 3`)
        const description2 = parse(`b --> a | this -> 2\na --> 1`)
        const summarized = toHierarchical(summarize(description1, description2))
        expect(serializeString(concretize(summarized, {}))).to.oneOf([
            `a --> 1 | this -> 2`,
            `a --> 1 | this -> 3`,
            `a --> b | this -> 2\nb --> 1`,
            `a --> b | this -> 3\nb --> 1`,
        ])
    })
})
