import { expect } from "chai"
import { EMPTY } from "rxjs"
import {
    insert,
    createDefaultStep,
    renameNoun,
    replace,
    removeStep,
    serializeString,
    toHierarchical,
    getAtPath,
    HierarchicalParsedGrammarDefinition,
    HierarchicalParsedSteps,
    HierarchicalPath,
    translatePath,
    parseDescription,
    localizeStepsSerializer,
} from "../src"
import { validateHierarchical } from "./hierarchical"

// TODO: test selection after edit
/* TODO: recognize condition patterns
it("should translate selection into < step", () => {})
it("should translate selection into > step", () => {})
it("should translate selection into != step", () => {})
it("should translate selection into multiple > < != step connected with and", () => {})
it("should translate selection into multiple > < != step connected with or", () => {})
it("should translate selection into multiple > < != step connected with both: or, and", () => {})*/

function getLastStepInPath(
    path: HierarchicalPath,
    grammar: HierarchicalParsedGrammarDefinition
): HierarchicalParsedSteps {
    const translatedPath = translatePath(grammar, path)
    if (translatedPath == null) {
        throw new Error(`can't retrieve last step in path (path "${path.join(",")}" corrupted?)`)
    }
    return getAtPath(translatedPath, path.length - 1)
}

describe("editor", () => {
    it("should multi insert after at substep", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), indices: [] },
                { steps: getLastStepInPath(["a@test", 0], inputGrammar), indices: [] },
            ],
            "after",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 -> 2 + 1 | this * 2 -> 2 + 1 -> this + 3`
        )
    })

    it("should insert after at substep", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), indices: [] }],
            "after",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * 2 -> 2 + 1 -> this + 3`
        )
    })

    it("should insert after with selection", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {
                "a@test,1,0": [
                    { after: "abc", before: "abc" },
                    { after: "xyz", before: "xyz" },
                ],
            },
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), indices: [{ after: "abc", before: "abc" }] }],
            "after",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * 2 -> if id() == "abc" then { 2 + 1 } else { this } -> this + 3`
        )
    })

    it("should do nothing with no selection", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {
                "a@test,1,0": [
                    { after: "abc", before: "abc" },
                    { after: "xyz", before: "xyz" },
                ],
            },
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), indices: [] }],
            "after",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * 2 -> this + 3`
        )
    })

    it("should insert before at noun", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), indices: [] }],
            "before",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 2 + 1 -> (1 | this * 2 -> this + 3)`
        )
    })

    it("should insert before at substep", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), indices: [] }],
            "before",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | 2 + 1 -> this * 2 -> this + 3`
        )
    })

    it("should insert parallel at substep", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), indices: [] }],
            "parallel",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * 2 -> this + 3 | 2 + 1`
        )
    })

    it("should insert parallel at noun", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), indices: [] }],
            "parallel",
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * 2 -> this + 3 | 2 + 1`
        )
    })

    it("should replace step", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = replace(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar), indices: [] }],
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * this -> this + 3`
        )
    })

    it("should replace step with selection", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = replace(
            {
                "a@test,1,0,1": [
                    { after: "abc", before: "abc" },
                    { after: "xyz", before: "xyz" },
                ],
            },
            [
                {
                    steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar),
                    indices: [{ after: "abc", before: "abc" }],
                },
            ],
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | this * if id() == "abc" then { this } else { 2 } -> this + 3`
        )
    })

    it("should multi replace step", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = replace(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar), indices: [] },
                { steps: getLastStepInPath(["a@test", 0], inputGrammar), indices: [] },
            ],
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> this | this * this -> this + 3`
        )
    })

    it("should rename noun", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | b * 2 -> this + 3\n\nb -> 2`, "test"))
        const { grammar } = renameNoun({}, [{ steps: "b@test", indices: [] }], "xyz@test", inputGrammar)
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | xyz * 2 -> this + 3\n\nxyz -> 2`
        )
    })

    it("should remove step at noun", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | b -> this + 3\n\nb -> 2`, "test"))
        const { grammar } = removeStep(
            {},
            [{ steps: "b@test", indices: [] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a -> 1 | this + 3`)
    })

    it("should remove step from parallel", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | b * 2 -> this + 3\n\nb -> 2`, "test"))
        const { grammar } = removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 0], inputGrammar), indices: [] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> b * 2 -> this + 3\n\nb -> 2`
        )
    })

    it("should remove step with selection", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 | b * 2 -> this + 3\n\nb -> 2`, "test"))
        const { grammar } = removeStep(
            {
                "a@test,0": [
                    { after: "abc", before: "abc" },
                    { after: "xyz", before: "xyz" },
                ],
            },
            [{ steps: getLastStepInPath(["a@test", 0], inputGrammar), indices: [{ after: "abc", before: "abc" }] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> if id() == "abc" then { null } else { 1 } | b * 2 -> this + 3\n\nb -> 2`
        )
    })

    it("should remove step from sequential and simplify", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 -> drive() -> 2`, "test"))
        const { grammar } = removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1], inputGrammar), indices: [] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a -> 1 -> 2`)
    })

    it("should multi remove step from sequential and simplify", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> 1 -> test() -> drive() -> 2`, "test"))
        const { grammar } = removeStep(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1], inputGrammar), indices: [] },
                { steps: getLastStepInPath(["a@test", 2], inputGrammar), indices: [] },
            ],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a -> 1 -> 2`)
    })

    it("should not remove step from if condition", () => {
        const inputGrammar = toHierarchical(parseDescription(`a -> if this > 5 then { 22 } else { this + 2 }`, "test"))
        const { grammar } = removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 0], inputGrammar), indices: [] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> if this > 5 then { 22 } else { this + 2 }`
        )
    })

    it("should remove step from operation", () => {
        const inputGrammar = toHierarchical(
            parseDescription(`a -> if this > 5 then { operation("abc", 3) } else { this + 2 }`, "test")
        )
        const { grammar } = removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 1], inputGrammar), indices: [] }],
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
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> if this > 5 then { operation("abc", null) } else { this + 2 }`
        )
    })

    it("should remove step from if by replacing in multiplication", () => {
        const inputGrammar = toHierarchical(
            parseDescription(`a -> 1 | b * if true then { "123" } else { 3 } -> this + 3\n\nb -> 2`, "test")
        )
        const { grammar } = removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0, 1, 1], inputGrammar), indices: [] }],
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a -> 1 | b * if true then { null } else { 3 } -> this + 3\n\nb -> 2`
        )
    })
})
