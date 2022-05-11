import { expect } from "chai"
import { parse, serializeString, summarize, unifyNested } from "../src"

describe("summarize grammars", () => {
    it("should unify and group nested random", () => {
        const steps = parse(`a --> { 50%: { 25%: 1 50%: 2 25%: 3 } 50%: { 10%: 2 30%: 3 60%: 1 } }`)[0].step
        const result = unifyNested(steps)
        expect(serializeString([{ name: "a", step: result }])).to.equal(`a --> { 42.5%: 1 30%: 2 27.5%: 3 }`)
    })

    it("should unify nested random", () => {
        const steps = parse(`a --> { 50%: { 25%: 1 50%: 2 25%: 3 } 50%: 4 }`)[0].step
        const result = unifyNested(steps)
        expect(serializeString([{ name: "a", step: result }])).to.equal(`a --> { 12.5%: 1 25%: 2 12.5%: 3 50%: 4 }`)
    })

    it("should unify nested random with brackets", () => {
        const steps = parse(`a --> { 50%: ({ 25%: 1 50%: 2 25%: 3 }) 50%: 2 }`)[0].step
        const result = unifyNested(steps)
        expect(serializeString([{ name: "a", step: result }])).to.equal(`a --> { 12.5%: 1 75%: 2 12.5%: 3 }`)
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

        expect(serializeString(result)).to.equal(`a --> { 50%: 1 50%: b } | this -> { 50%: 3 50%: b }\n\nb -> 1`)
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
        expect(serializeString(summarizedGrammar)).to.equal(`s1 -> if (this == false) then { 25%: 2 75%: 1 } else { 2 }`)
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
