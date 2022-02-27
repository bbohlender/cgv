import { parse, replaceSymbolsGrammar, serialize, trimGrammar, trimSteps } from "../src"
import { expect } from "chai"

describe("trim grammar / steps", () => {
    //only testing the trimming of brackets
    it("should trim brackets", () => {
        const grammar = parse(`a -> (1) if true then (2 * (this)) else (-2)`)

        const result = trimSteps(grammar["a"])

        expect(
            serialize({
                a: result,
            })
        ).to.deep.equal(`a -> 1 if true then (2 * this) else -2`)
    })

    //testing the trimming of brackets and nesting
    it("should trim nesting", () => {
        const grammar = parse(`a -> 1 2 (3 (4 this) 5)`)

        const result = trimSteps(grammar["a"])

        expect(
            serialize({
                a: result,
            })
        ).to.equal(`a -> 1 2 3 4 this 5`)
    })

    //more complex combination of trim nested and trim brackets
    it("should trim steps", () => {
        const grammar = parse(`a -> (((1*1)*2) + (3*3)) | (1 | 3) | (1 | 4) * 2`)

        const result = trimSteps(grammar["a"])

        expect(
            serialize({
                a: result,
            })
        ).to.equal(`a -> 1 * 1 * 2 + 3 * 3 | 1 | 3 | (1 | 4) * 2`)
    })

    it("should trim grammar", () => {
        const grammar = parse(`a -> (((1*1)*2) + (3*3)) | (1 | 3) | (1 | 4) * 2`)

        const result = trimGrammar(grammar)

        expect(serialize(result)).to.equal(`a -> 1 * 1 * 2 + 3 * 3 | 1 | 3 | (1 | 4) * 2`)
    })
})

describe("replace symbols in grammars / steps", () => {
    it("should remove all symbols", () => {

    })

    it("should throw because of recursive symbol usage", () => {
        const grammar = parse(`a -> 1+2 if (this == 3) then 1 else (1 | a)`)
        expect(() => replaceSymbolsGrammar(grammar)).to.throw("the summarizer does not yet support recursion")
    })

    
    it("should throw because of unknown symbol", () => {
        const grammar = parse(`a -> 1+2 if (this == 3) then 1 else (1 | b)`)
        expect(() => replaceSymbolsGrammar(grammar)).to.throw('unknown rule "b"')
    })
})
