import { expect } from "chai"
import { combineRandomAndReplace, combineSteps, equalizeSteps, parse, ParsedParallel, serialize, summarize } from "../src"

describe("summarize grammars", () => {
    it("should combine inner steps with using a random step based on the operation type and at least one equal child", () => {
        const steps1 = parse(`a -> 1 | this 3`)["a"]
        const steps2 = parse(`a -> 2 | this 2`)["a"]

        const [equalizedSteps1, equalizedSteps2] = equalizeSteps([steps1, steps2])

        const result = combineSteps([equalizedSteps1, equalizedSteps2], combineRandomAndReplace)

        //expect(result1).to.equal(result2)
        expect(serialize({ a: result })).to.equal(`a -> { 50%: 1 50%: 2 } | this { 50%: 3 50%: 2 }`)
    })

    it("should not combine steps with using a random step based on the operation type and at least one equal child", () => {
        const steps1 = parse(`a -> 1 | this 3`)["a"]
        const steps2 = parse(`a -> 2 | 1 2`)["a"]

        const result = combineSteps([steps1, steps2], combineRandomAndReplace)

        expect(
            serialize({
                a: result,
            })
        ).to.equal(`a -> { 50%: 1 | this 3 50%: 2 | 1 2 }`)
    })

    //TODO: should combine steps unordered with different amount of parallel steps

    it("should combine steps unodered in a ParallelStep", () => {
        const steps1 = parse(`s1 -> 1 | this 3`)["a"]
        const steps2 = parse(`s1 -> this 2 | 2`)["a"]

        const result = combineSteps([steps1, steps2], combineRandomAndReplace)

        expect(serialize({ a: result })).to.equal(`a -> { 50%: 1 50%: 2 } | this { 50%: 3 50%: 2 }`)
    })

    it("should summarize two grammars as a outer random switch even though they both start with the same operator", () => {
        const grammar1 = parse(`s1 -> if (this == 2) then 2 else 2`)
        const grammar2 = parse(`s1 -> if (true == false) then 1 else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2])
        expect(serialize(summarizedGrammar)).to.equal(
            `s1 -> { 50%: if (this == 2) then 2 else 2 50%: if (true == false) then 1 else 2 }`
        )
    })

    it("should summarize two grammars as a outer random switch as they are completly different", () => {
        const grammar1 = parse(`s1 -> this * 3 / 5`)
        const grammar2 = parse(`s1 -> switch this case 0: (4 * 4)`)
        const summarizedGrammar = summarize([grammar1, grammar2])
        expect(serialize(summarizedGrammar)).to.equal(`s1 -> { 50%: this * 3 / 5 50%: switch this case 0: (4 * 4) }`)
    })

    it("should summarize two grammars as multiple innter random switches", () => {
        const grammar1 = parse(`s1 -> if (this == false) then 2 else 2`)
        const grammar2 = parse(`s1 -> if (this == false) then 1 else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2])
        expect(serialize(summarizedGrammar)).to.equal(`s1 -> if (this == false) then { 50%: 2 50%: 1 } else 2`)
    })

    it("should summarize multiple grammars with outer and inner switches based on their similarity", () => {
        const grammar1 = parse(`s1 -> if (this == false) then 2 else 2`)
        const grammar2 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar3 = parse(`s1 -> this == false`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3])
        expect(serialize(summarizedGrammar)).to.equal(
            [`s1 -> { 66.67%: if s2 then { 50%: 2 50%: 1 } else 2 33.33%: s2 }`, `s2 -> this == false`].join("\n")
        )
    })

    it("should summarize multiple grammars and calculate probability", () => {
        const grammar2 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar1 = parse(`s1 -> if (this == false) then 2 else 2`)
        const grammar3 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar4 = parse(`s1 -> if (this == false) then 1 else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3, grammar4])
        expect(serialize(summarizedGrammar)).to.equal(`s1 -> if (this == false) then { 75%: 1 25%: 2 } else 2`)
    })

    it("should summarize grammars with same operation identifier", () => {
        const grammar1 = parse(`s1 -> if (this == false) then doOne(3) else 2`)
        const grammar2 = parse(`s1 -> if (this == false) then doTwo(3) else 2`)
        const grammar3 = parse(`s1 -> if (this == false) then doOne(4) else 2`)
        const grammar4 = parse(`s1 -> if (this == false) then doOne(4) else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3, grammar4])
        expect(serialize(summarizedGrammar)).to.equal(
            `s1 -> if (this == false) then { 75%: doOne({ 66.67%: 4 33.33%: 3 }) 25%: doTwo(3) } else 2`
        )
    })
})
