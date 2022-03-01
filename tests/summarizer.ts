import { expect } from "chai"
import { parse, serialize, summarize } from "../src"

describe("summarize grammars", () => {
    it("should summarize two grammars as a outer random switch even though they both start with the same operator", () => {
        const grammar1 = parse(`a -> if (this == 2) then 2 else 2`)
        const grammar2 = parse(`a -> if (true == false) then 1 else 2`)
        const summarizedGrammar = summarize(grammar1, grammar2)
        expect(serialize(summarizedGrammar)).to.equal(`a -> 50% (if (this == 2) then 2 else 2) 50% (if (true === false) then 1 else 2)`)
    })
    
    it("should summarize two grammars as a outer random switch as they are completly different", () => {
        const grammar1 = parse(`a -> this * 3 / 5`)
        const grammar2 = parse(`a -> switch this case 0: (4 * 4)`)
        const summarizedGrammar = summarize(grammar1, grammar2)
        expect(serialize(summarizedGrammar)).to.equal(`a -> 50% (this * 3 / 5) 50% (switch this case 0: (4 * 4))`)
    })
    
    it("should summarize two grammars as multiple innter random switches", () => {
        const grammar1 = parse(`a -> if (this == false) then 2 else 2`)
        const grammar2 = parse(`a -> if (true == false) then 1 else 2`)
        const summarizedGrammar = summarize(grammar1, grammar2)
        expect(serialize(summarizedGrammar)).to.equal(`a -> if (this == false) then (50% 2 50% 1) else 2`)
    })

    it("should summarize two grammars as a outer random switch, which both reference the same inner symbol ", () => {
        const grammar1 = parse(`a -> if (this == false) then 2 else 2`)
        const grammar2 = parse(`a -> if (true == false) then 1 else 2`)
        const summarizedGrammar = summarize(grammar1, grammar2)
        expect(serialize(summarizedGrammar)).to.equal(`a -> if (this == false) then (50% 2 50% 1) else 2`)
    })

    it("should summarize multiple grammars with outer and inner switches based on their similarity", () => {

    })
})