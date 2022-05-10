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
    getSelectionCondition,
    Value,
    ParsedSteps,
    idSelectionPattern,
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
        const { grammar } = removeStep({}, [{ steps: "b@test", indices: [] }], {}, inputGrammar)
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

describe("pattern", () => {
    it("should get undefined as selection condition as all values are selected", async () => {
        const condition = await getSelectionCondition([], [], undefined, () => Promise.resolve(undefined))
        expect(condition).to.be.undefined
    })

    it("should get undefined as selection condition as no pattern matched", async () => {
        const values: Array<Value<undefined, undefined>> = [
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [1],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(values, [values[1]], undefined, ([condition]) =>
            Promise.resolve(condition)
        )
        expect(condition).to.be.undefined
    })

    it("should get undefined as selection condition as no value was selected", async () => {
        const values: Array<Value<undefined, undefined>> = [
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(values, [], undefined, ([condition]) =>
            Promise.resolve(condition)
        )
        expect(condition).to.be.undefined
    })

    it("should get undefined as selection condition as no condition was selected", async () => {
        const values: Array<Value<undefined, undefined>> = [
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [1],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(values, [values[0], values[1]], undefined, ([condition]) =>
            Promise.resolve(undefined)
        )
        expect(condition).to.be.undefined
    })

    it("should get id selection condition", async () => {
        const values: Array<Value<undefined, undefined>> = [
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [1],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [1],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(values, [values[0], values[1]], undefined, ([condition]) =>
            Promise.resolve(condition)
        )
        expect(condition).to.be.deep.equal({
            type: "equal",
            children: [
                {
                    type: "operation",
                    identifier: "id",
                    children: [],
                },
                {
                    type: "raw",
                    value: "0",
                },
            ],
        })
    })

    it("should get custom selection condition", async () => {
        const customCondition: ParsedSteps = {
            type: "raw",
            value: false,
        }
        const values: Array<Value<undefined, undefined>> = [
            {
                annotation: undefined,
                index: [0],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [1],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(values, [values[1], values[2]], undefined, () =>
            Promise.resolve(customCondition)
        )
        expect(condition).to.be.deep.equal(customCondition)
    })

    it("should get selection condition based on domain specific pattern", async () => {
        const values: Array<Value<string, undefined>> = [
            {
                annotation: undefined,
                index: [],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: "x",
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: "y",
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: "x",
                symbolDepth: {},
                variables: {},
            },
            {
                annotation: undefined,
                index: [],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: "z",
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getSelectionCondition(
            values,
            [values[1], values[2], values[3]],
            [
                idSelectionPattern,
                {
                    getConditionKey: (value) => value.raw,
                    getConditionStep: (value) => ({
                        type: "equal",
                        children: [
                            {
                                type: "this",
                            },
                            {
                                type: "raw",
                                value: value.raw,
                            },
                        ],
                    }),
                },
            ],
            ([condition]) => Promise.resolve(condition)
        )
        expect(condition).to.be.deep.equal({
            type: "or",
            children: [
                {
                    type: "equal",
                    children: [
                        {
                            type: "this",
                        },
                        {
                            type: "raw",
                            value: "x",
                        },
                    ],
                },
                {
                    type: "equal",
                    children: [
                        {
                            type: "this",
                        },
                        {
                            type: "raw",
                            value: "z",
                        },
                    ],
                },
            ],
        })
    })
})
