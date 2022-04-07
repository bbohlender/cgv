import { expect } from "chai"
import { parse, serializeString, toHierachical } from "../src"
import { add, createDefaultStep, remove, renameNoun, replace } from "../src/editor"
import { validateHierarchical } from "./hierarchical"

//TODO: assure operator precedence correctness for serializing with bracket

describe("editor", () => {
    it("should translate selection into < step", () => {})
    it("should translate selection into > step", () => {})
    it("should translate selection into != step", () => {})
    it("should translate selection into multiple > < != step connected with and", () => {})
    it("should translate selection into multiple > < != step connected with or", () => {})
    it("should translate selection into multiple > < != step connected with both: or, and", () => {})

    it("should add after at substep", () => {
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!.children![0]!
        add(
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

    it("should add before before at noun", () => {
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
        add(
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

    it("should add before before at substep", () => {
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!.children![1]!
        add(
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

    it("should add parallel at substep", () => {
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
        const at = grammar["a"].children![1]!
        add(
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

    it("should add parallel at noun", () => {
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
        add(
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
        const grammar = toHierachical(parse(`a -> 1 | this * 2 this + 3`))
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
        const grammar = toHierachical(parse(`a -> 1 | b * 2 this + 3\n\nb -> 2`))
        renameNoun("b", "xyz", grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | xyz * 2 this + 3\n\nxyz -> 2`)
    })

    it("should remove noun", () => {
        const grammar = toHierachical(parse(`a -> 1 | b * 1 this + 3\nb -> 2`))
        remove("b", {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | 2 * 1 this + 3`)
    })

    it("should remove from parallel", () => {
        const grammar = toHierachical(parse(`a -> 1 | b * 2 this + 3\n\nb -> 2`))
        const at = grammar["a"].children![0]
        remove(at, {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> b * 2 this + 3\n\nb -> 2`)
    })

    it("should remove from parallel and simplify", () => {
        const grammar = toHierachical(parse(`a -> 1 | 2`))
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
        const grammar = toHierachical(parse(`a -> if (this > 5) then 22 else (this + 2)`))
        const at = grammar["a"].children![0]
        remove(at, {}, grammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> if true then 22 else (this + 2)`)
    })

    it("should remove from operator", () => {
        const grammar = toHierachical(parse(`a -> if (this > 5) then operator("abc", 3) else (this + 2)`))
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
