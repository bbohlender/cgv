import {
    equalizeSteps,
    parse,
    ParsedBinaryOperator,
    ParsedParallel,
    replaceSymbolsGrammar,
    serialize,
    splitSteps,
    trimGrammar,
    trimSteps,
} from "../src"
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
        const grammar = parse(` a -> if true then c else (22 b)
                                b -> switch this
                                    case 0: ggg
                                    case 1: (1 2 c)
                                c -> this
                                ggg -> this * 3`)
        const [name, stepReplaced] = replaceSymbolsGrammar(grammar)
        expect(serialize({ [name]: stepReplaced })).to.equal(
            "a -> if true then (this) else (22 (switch this case 0: (this * 3) case 1: (1 2 (this))))"
        )
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

describe("equalize steps", () => {
    it("should equalize equal steps within one steps AST", () => {
        const grammar = parse(`a -> 1 * 1 | 1 * 1`)
        const equalizedSteps = equalizeSteps([grammar["a"]])[0] as ParsedParallel
        expect(equalizedSteps.children[0]).to.equal(equalizedSteps.children[1])
        const multiplicationStep = equalizedSteps.children[0] as ParsedBinaryOperator
        expect(multiplicationStep.children[0]).to.equal(multiplicationStep.children[1])
    })

    it("should equalize all equal steps within and between multiple steps ASTs", () => {
        const parallel1 = parse(`a -> 3 * 1 | 1`)["a"] as ParsedParallel
        const parallel2 = parse(`a -> 2 * 1 | 1`)["a"] as ParsedParallel
        const parallel3 = parse(`a -> 4 * 1 | 1`)["a"] as ParsedParallel

        const [equalizedParallel1, equalizedParallel2, equalizedParallel3] = equalizeSteps([
            parallel1,
            parallel2,
            parallel3,
        ]) as Array<ParsedParallel>

        const multiplication1 = equalizedParallel1.children[0] as ParsedBinaryOperator
        const multiplication2 = equalizedParallel2.children[0] as ParsedBinaryOperator
        const multiplication3 = equalizedParallel3.children[0] as ParsedBinaryOperator

        expect(multiplication1.children[1])
            .to.equal(multiplication2.children[1])
            .to.equal(multiplication3.children[1])
            .to.equal(equalizedParallel1.children[1])
            .to.equal(equalizedParallel2.children[1])
            .to.equal(equalizedParallel3.children[1])
    })
})

describe("split steps", () => {
    it("should not split split the root ParsedSteps", () => {
        const grammar = parse(`a -> 1 + 2 if (this == 1) then 1 else (1 | 2)`)
        const [, splittedSteps] = splitSteps(equalizeSteps([grammar["a"]])[0])[0]
        expect(
            serialize({
                a: splittedSteps,
            })
        ).to.equal(`a -> 1 + 2 if (this == 1) then 1 else (1 | 2)`)
    })

    it("should the ParsedSteps recursively", () => {
        const grammar = parse(`a -> 1 * 3 * 3 if (1 * 3 * 3 == 3) then (22 | 1 * 3) else (1 * 3 + 2)`)
        const stepsList = splitSteps(equalizeSteps([grammar["a"]])[0])
        expect(serialize(stepsList.reduce((acc, [name, steps]) => ({ ...acc, [name]: steps }), {}))).to.equal(
            `s1 -> s2 if (s2 == 3) then (22 | s3) else (s3 + 2)\ns2 -> s3 * 3\ns3 -> 1 * 3`
        )
    })
})
