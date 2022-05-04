import {
    computeDependencies,
    getLocalDescription,
    localizeStepsSerializer,
    parse,
    parseDescription,
    ParsedSteps,
    serializeString,
    toHierarchical,
    toHierarchicalSteps,
} from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"
import { validateHierarchical, validateHierarchicalSteps } from "./hierarchical"
import produce from "immer"

//TOOD: precedence

describe("hierarchical steps", () => {
    it("should create valid hierachical steps", () => {
        for (const { parsed } of parsedAndUnparsedGrammarPairs) {
            const hierachical = toHierarchical(parsed)
            expect(() => validateHierarchical(hierachical)).to.not.throw()
        }
    })

    it(`should throw an error when validating unvalid hierchical steps`, () => {
        const steps: ParsedSteps = {
            type: "parallel",
            children: [
                {
                    type: "this",
                },
                {
                    type: "sequential",
                    children: [
                        {
                            type: "return",
                        },
                        {
                            type: "raw",
                            value: 22,
                        },
                    ],
                },
            ],
        }
        const correct = toHierarchicalSteps(steps, "a")
        const incorrect = produce(correct, (draft) => {
            draft.children![1]!.children![1]!.path = ["a", 1, 0]
        })
        expect(() => validateHierarchicalSteps(correct, "a")).to.not.throw()
        expect(() => validateHierarchicalSteps(incorrect, "a")).to.throw(
            `path at "a -> 1 -> 1" is wrong. Found: "a -> 1 -> 0"`
        )
    })
})

describe("description", () => {
    it("should compute dependencies", () => {
        const globalDescription = parse("a@1 -> b@2 | a@1 | 1 -> 2\nb@2 -> 33\nc@2 -> k@3")
        const dependencies = computeDependencies(globalDescription)
        expect(dependencies).to.deep.equal({
            "1": ["b@2"],
            "2": ["k@3"],
        })
    })

    it("should compute description including dependencies", () => {
        const globalDescription = parseDescription("a -> b@2 | a | 1 -> 2\nb@2 -> 33\nc@2 -> k@3", "1")
        const dependencies = computeDependencies(globalDescription)
        const localDescription = getLocalDescription(globalDescription, dependencies, "1")
        expect(serializeString(localDescription, localizeStepsSerializer.bind(null, "1"))).to.equal(
            "a -> b@2 | a | 1 -> 2\n\nb@2 -> 33"
        )
    })
})
