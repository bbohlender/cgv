import { ParsedSteps, toHierarchical, toHierarchicalSteps } from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"
import { validateHierarchical, validateHierarchicalSteps } from "./hierarchical"

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
        const hierachical = toHierarchicalSteps(steps, "a")
        hierachical.children![1]!.children![1]!.path = ["a", 1, 0]
        expect(() => validateHierarchicalSteps(hierachical, "a")).to.throw(
            `path at "a -> 1 -> 1" is wrong. Found: "a -> 1 -> 0"`
        )
    })
})
