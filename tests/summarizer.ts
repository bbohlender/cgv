import { expect } from "chai"
import {
    combineRandomAndReplace,
    combineSteps,
    equalizeSteps,
    parse,
    serialize,
    summarize,
    unifyNestedRandom,
} from "../src"

describe("summarize grammars", () => {
    //TODO: keep grammar symbol names

    it("should unify and group nested random", () => {
        const steps = parse(`a -> { 50%: { 25%: 1 50%: 2 25%: 3 } 50%: { 10%: 2 30%: 3 60%: 1 } }`)["a"]
        const result = unifyNestedRandom(equalizeSteps([steps])[0])
        expect(serialize({ a: result })).to.equal(`a -> { 42.5%: 1 30%: 2 27.5%: 3 }`)
    })

    it("should unify nested random", () => {
        const steps = parse(`a -> { 50%: { 25%: 1 50%: 2 25%: 3 } 50%: 4 }`)["a"]
        const result = unifyNestedRandom(equalizeSteps([steps])[0])
        expect(serialize({ a: result })).to.equal(`a -> { 12.5%: 1 25%: 2 12.5%: 3 50%: 4 }`)
    })

    it("should unify nested random with brackets", () => {
        const steps = parse(`a -> { 50%: ({ 25%: 1 50%: 2 25%: 3 }) 50%: 2 }`)["a"]
        const result = unifyNestedRandom(equalizeSteps([steps])[0])
        expect(serialize({ a: result })).to.equal(`a -> { 12.5%: 1 75%: 2 12.5%: 3 }`)
    })

    it("should combine inner steps with using a random step based on the operation type and at least one equal child", () => {
        const steps1 = parse(`a -> 1 | this 3`)["a"]
        const steps2 = parse(`a -> 2 | this 2`)["a"]

        const [equalizedSteps1, equalizedSteps2] = equalizeSteps([steps1, steps2])

        const result = combineSteps([equalizedSteps1, equalizedSteps2], combineRandomAndReplace, unifyNestedRandom)

        //expect(result1).to.equal(result2)
        expect(serialize({ a: result })).to.equal(`a -> { 50%: 1 50%: 2 } | this { 50%: 3 50%: 2 }`)
    })

    it("should not combine steps with using a random step based on the operation type and at least one equal child", () => {
        const steps1 = parse(`a -> 1 | this 3`)["a"]
        const steps2 = parse(`a -> 2 | 1 2`)["a"]

        const result = combineSteps([steps1, steps2], combineRandomAndReplace, unifyNestedRandom)

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

        const result = combineSteps([steps1, steps2], combineRandomAndReplace, unifyNestedRandom)

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

    it("should summarize two equal grammars as the same", () => {
        const text = `s1 -> if (this == false) then switch this case 0: 1 case 1: 0 else 2`
        const grammar1 = parse(text)
        const grammar2 = parse(text)
        const grammar3 = parse(text)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3])
        expect(serialize(summarizedGrammar)).to.equal(text)
    })

    it("should summarize multiple grammars with outer and inner switches based on their similarity", () => {
        const grammar1 = parse(`s1 -> if (this == false) then 2 else 2`)
        const grammar2 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar3 = parse(`s1 -> this == false`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3])
        expect(serialize(summarizedGrammar)).to.equal(
            `s1 -> { 66.67%: if (this == false) then { 50%: 2 50%: 1 } else 2 33.33%: this == false }`
        )
    })

    it("should summarize multiple grammars and calculate probability", () => {
        const grammar2 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar1 = parse(`s1 -> if (this == false) then 2 else 2`)
        const grammar3 = parse(`s1 -> if (this == false) then 1 else 2`)
        const grammar4 = parse(`s1 -> if (this == false) then 1 else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3, grammar4])
        expect(serialize(summarizedGrammar)).to.equal(`s1 -> if (this == false) then { 25%: 2 75%: 1 } else 2`)
    })

    it("should summarize grammars with same operation identifier", () => {
        const grammar3 = parse(`s1 -> if (this == false) then doOne(4) else 2`)
        const grammar1 = parse(`s1 -> if (this == false) then doOne(3) else 2`)
        const grammar2 = parse(`s1 -> if (this == false) then doTwo(3) else 2`)
        const grammar4 = parse(`s1 -> if (this == false) then doOne(4) else 2`)
        const summarizedGrammar = summarize([grammar1, grammar2, grammar3, grammar4])
        expect(serialize(summarizedGrammar)).to.equal(
            `s1 -> if (this == false) then { 25%: doOne(3) 25%: doTwo(3) 50%: doOne(4) } else 2`
        )
    })
})
