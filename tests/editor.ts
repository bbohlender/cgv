import { expect } from "chai"
import { parse, serializeString, toHierarchical } from "../src"
import { insert, createDefaultStep, renameNoun, replace } from "../src/editor"
import { validateHierarchical } from "./hierarchical"

//TODO: assure operator precedence correctness for serializing with bracket

/*
describe("editor", () => {
    it("should translate selection into < step", () => {})
    it("should translate selection into > step", () => {})
    it("should translate selection into != step", () => {})
    it("should translate selection into multiple > < != step connected with and", () => {})
    it("should translate selection into multiple > < != step connected with or", () => {})
    it("should translate selection into multiple > < != step connected with both: or, and", () => {})

    it("should insert after at substep", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!.children![0]!
        insert(
            "after",
            at,
            createDefaultStep(
                {
                    type: "add",
                },
                {}
            ),
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 2 + 1 this + 3`)
    })

    it("should insert before before at noun", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        insert(
            "before",
            "a",
            createDefaultStep(
                {
                    type: "add",
                },
                {}
            ),
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 2 + 1 (1 | this * 2 this + 3)`)
    })

    it("should insert before before at substep", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!.children![1]!
        insert(
            "before",
            at,
            createDefaultStep(
                {
                    type: "add",
                },
                {}
            ),
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 2 + 1 this + 3`)
    })

    it("should insert parallel at substep", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!
        insert(
            "parallel",
            at,
            createDefaultStep(
                {
                    type: "add",
                },
                {}
            ),
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 this + 3 | 2 + 1`)
    })

    it("should insert parallel at noun", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        insert(
            "parallel",
            "a",
            createDefaultStep(
                {
                    type: "add",
                },
                {}
            ),
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 this + 3 | 2 + 1`)
    })

    it("should replace step", () => {
        const grammar = toHierarchical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!.children![0].children![1]!
        replace(
            at,
            {
                type: "this",
            },
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * this this + 3`)
    })

    it("should rename noun", () => {
        const oldGrammar = toHierarchical(parse(`a -> 1 | b * 2 this + 3\n\nb -> 2`))
        const { grammar } = renameNoun("b", "xyz", oldGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | xyz * 2 this + 3\n\nxyz -> 2`)
    })

    it("should remove noun", () => {
        const grammar = toHierarchical(parse(`a -> 1 | b * 1 this + 3\nb -> 2`))
        remove("b", {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | 2 * 1 this + 3`)
    })

    it("should remove from parallel", () => {
        const grammar = toHierarchical(parse(`a -> 1 | b * 2 this + 3\n\nb -> 2`))
        const at = grammar["a"].children![0]
        remove(at, {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> b * 2 this + 3\n\nb -> 2`)
    })

    it("should remove from parallel and simplify", () => {
        const grammar = toHierarchical(parse(`a -> 1 | 2`))
        const at = grammar["a"].children![0]
        remove(at, {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(grammar).to.deep.equal({
            //a -> 2
            a: {
                type: "raw",
                value: 2,
                parent: "a",
                children: undefined,
                childrenIndex: undefined,
            },
        })
    })

    it("should remove from if", () => {
        const grammar = toHierarchical(parse(`a -> if (this > 5) then 22 else (this + 2)`))
        const at = grammar["a"].children![0]
        remove(at, {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> if true then 22 else (this + 2)`)
    })

    it("should remove from operator", () => {
        const grammar = toHierarchical(parse(`a -> if (this > 5) then operator("abc", 3) else (this + 2)`))
        const at = grammar["a"].children![1]!.children![0]
        remove(
            at,
            {
                operator: {
                    execute: () => {
                        throw new Error(`not implemented`)
                    },
                    includeThis: true,
                    defaultParameters: [() => ({ type: "raw", value: "" }), () => ({ type: "raw", value: 1 })],
                },
            },
            grammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> if (this > 5) then operator("", 3) else (this + 2)`)
    })
})
*/
