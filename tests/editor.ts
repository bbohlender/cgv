import { expect } from "chai"
import { EMPTY } from "rxjs"
import {
    insert,
    createDefaultStep,
    renameNoun,
    replace,
    removeStep,
    parse,
    serializeString,
    toHierarchical,
    removeValue,
    getAtPath,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    translatePath,
} from "../src"
import { validateHierarchical } from "./hierarchical"

// TODO: simplifications
// TODO: test selection after edit
// TODO: test subselections (indices)
/* TODO: recognize condition patterns
it("should translate selection into < step", () => {})
it("should translate selection into > step", () => {})
it("should translate selection into != step", () => {})
it("should translate selection into multiple > < != step connected with and", () => {})
it("should translate selection into multiple > < != step connected with or", () => {})
it("should translate selection into multiple > < != step connected with both: or, and", () => {})*/

function getLastStepInPath(path: HierarchicalPath, grammar: HierarchicalParsedGrammarDefinition): HierarchicalParsedSteps {
    const translatedPath = translatePath(grammar, path)
    if(translatedPath == null) {
        throw new Error("can't retrieve last step in path (path corrupted?)")
    }
    return getAtPath(translatedPath, path.length - 1)
}

describe("editor", () => {
    it("should multi insert after at substep", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "after",
            [
                { steps: getLastStepInPath(["a", 1, 0], inputGrammar), indices: undefined },
                { steps: getLastStepInPath(["a", 0], inputGrammar), indices: undefined },
            ],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 -> 2 + 1 | this * 2 -> 2 + 1 -> this + 3`)
    })

    it("should insert after at substep", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "after",
            [{ steps: getLastStepInPath(["a", 1, 0], inputGrammar), indices: undefined }],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 -> 2 + 1 -> this + 3`)
    })

    it("should insert before at noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "before",
            [{ steps: getLastStepInPath(["a"], inputGrammar), indices: undefined }],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 2 + 1 -> (1 | this * 2 -> this + 3)`)
    })

    it("should insert before at substep", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "before",
            [{ steps: getLastStepInPath(["a", 1, 0], inputGrammar), indices: undefined }],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | 2 + 1 -> this * 2 -> this + 3`)
    })

    it("should insert parallel at substep", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "parallel",
            [{ steps: getLastStepInPath(["a"], inputGrammar), indices: undefined }],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 -> this + 3 | 2 + 1`)
    })

    it("should insert parallel at noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = insert(
            "parallel",
            [{ steps: getLastStepInPath(["a"], inputGrammar), indices: undefined }],
            () =>
                createDefaultStep(
                    {
                        type: "add",
                    },
                    {}
                ),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * 2 -> this + 3 | 2 + 1`)
    })

    it("should replace step", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = replace(
            [{ steps: getLastStepInPath(["a", 1, 0, 1], inputGrammar), indices: undefined }],
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this * this -> this + 3`)
    })

    it("should multi replace step", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | this * 2 -> this + 3`))
        const { grammar } = replace(
            [
                { steps: getLastStepInPath(["a", 1, 0, 1], inputGrammar), indices: undefined },
                { steps: getLastStepInPath(["a", 0], inputGrammar), indices: undefined },
            ],
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> this | this * this -> this + 3`)
    })

    it("should rename noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | b * 2 -> this + 3\n\nb -> 2`))
        const { grammar } = renameNoun("b", "xyz", inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | xyz * 2 -> this + 3\n\nxyz -> 2`)
    })

    it("should remove step at noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | b -> this + 3\n\nb -> 2`))
        const { grammar } = removeStep([{ steps: getLastStepInPath(["b"], inputGrammar), indices: undefined }], {}, inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | this + 3`)
    })

    it("should multi remove value at noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | 2 -> 3 | b -> this + 3\n\nb -> 2`))
        const { grammar } = removeValue(
            [
                { steps: getLastStepInPath(["b"], inputGrammar), indices: undefined },
                { steps: getLastStepInPath(["a", 1, 1], inputGrammar), indices: undefined },
            ],
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1`)
    })

    it("should remove value at noun", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | b -> this + 3\n\nb -> 2`))
        const { grammar } = removeValue([{ steps: getLastStepInPath(["b"], inputGrammar), indices: undefined }], inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1`)
    })

    it("should remove step from parallel", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 | b * 2 -> this + 3\n\nb -> 2`))
        const { grammar } = removeStep([{ steps: getLastStepInPath(["a", 0], inputGrammar), indices: undefined }], {}, inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> this | b * 2 -> this + 3\n\nb -> 2`)
    })

    it("should remove step from sequential and simplify", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 -> drive() -> 2`))
        const { grammar } = removeStep([{ steps: getLastStepInPath(["a", 1], inputGrammar), indices: undefined }], {}, inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 -> 2`)
    })

    it("should multi remove step from sequential and simplify", () => {
        const inputGrammar = toHierarchical(parse(`a -> 1 -> test() -> drive() -> 2`))
        const { grammar } = removeStep(
            [
                { steps: getLastStepInPath(["a", 1], inputGrammar), indices: undefined },
                { steps: getLastStepInPath(["a", 2], inputGrammar), indices: undefined },
            ],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 -> 2`)
    })

    it("should remove step from if condition", () => {
        const inputGrammar = toHierarchical(parse(`a -> if this > 5 then { 22 } else { this + 2 }`))
        const { grammar } = removeStep([{ steps: getLastStepInPath(["a", 0], inputGrammar), indices: undefined }], {}, inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> if true then { 22 } else { this + 2 }`)
    })

    it("should remove step from operation", () => {
        const inputGrammar = toHierarchical(parse(`a -> if this > 5 then { operation("abc", 3) } else { this + 2 }`))
        const { grammar } = removeStep(
            [{ steps: getLastStepInPath(["a", 1, 0], inputGrammar), indices: undefined }],
            {
                operation: {
                    execute: () => EMPTY,
                    defaultParameters: [() => ({ type: "raw", value: "xyz" })],
                    includeThis: true,
                },
            },
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> if this > 5 then { operation("xyz", 3) } else { this + 2 }`)
    })

    it("should remove step from if in multiplication", () => {
        const inputGrammar = toHierarchical(
            parse(`a -> 1 | b * if true then { "123" } else { 3 } -> this + 3\n\nb -> 2`)
        )
        const { grammar } = removeStep([{ steps: getLastStepInPath(["a", 1, 0, 1, 1], inputGrammar), indices: undefined }], {}, inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar)).to.equal(`a -> 1 | b * if true then { 1 } else { 3 } -> this + 3\n\nb -> 2`)
    })
})
