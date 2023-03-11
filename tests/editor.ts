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
    getMatchingCondition,
    Value,
    ParsedTransformation,
    idPatternType,
    PatternSelector,
    copyNoun,
    parse,
    computePattern,
    patternIsMatching,
    indexModuloPatternType,
    getContainingCondition,
    generateAllPattern,
    allPatternType,
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

export function mockValue(index: Array<number>, raw?: any): Value<any> {
    return {
        index,
        invalid: {
            observable: EMPTY,
            value: false,
        },
        raw,
        symbolDepth: {},
        variables: {},
    }
}

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

const defaultConditionSelection: PatternSelector = ([condition]) => Promise.resolve(condition)

describe("editor", () => {
    it("should multi insert after at substep", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), values: [] },
                { steps: getLastStepInPath(["a@test", 0], inputGrammar), values: [] },
            ],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 -> 2 + 1 | this * 2 -> 2 + 1 -> this + 3`
        )
    })

    it("should insert after at substep", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | this * 2 -> 2 + 1 -> this + 3`
        )
    })

    it("should insert after with selection", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const [v1, v2] = [mockValue([0, 1]), mockValue([1, 1])]
        const { grammar } = await insert(
            {
                "a@test,1,0": [
                    { after: v1, before: v1 },
                    { after: v2, before: v2 },
                ],
            },
            [
                {
                    steps: getLastStepInPath(["a@test", 1, 0], inputGrammar),
                    values: [{ after: v1, before: v1 }],
                },
            ],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | this * 2 -> if id( ) == "0,1" then { 2 + 1 } else { this } -> this + 3`
        )
    })

    it("should insert after and simplify", async () => {
        const inputGrammar = toHierarchical(parse("a --> 1 -> 2"))
        const v0 = mockValue([])
        const { grammar } = await insert(
            {
                "a,1": [{ after: v0, before: v0 }],
            },
            [
                {
                    steps: getLastStepInPath(["a", 1], inputGrammar),
                    values: [{ after: v0, before: v0 }],
                },
            ],
            [],
            defaultConditionSelection,
            "after",
            () => ({ type: "raw", value: 3 }),
            inputGrammar
        )
        expect(grammar).to.deep.equal(toHierarchical(parse("a --> 1 -> 2 -> 3")))
    })

    it("should insert parallel and simplify", async () => {
        const inputGrammar = toHierarchical(parse("a --> 1 | 2"))
        const v0 = mockValue([])
        const { grammar } = await insert(
            {
                "a,1": [{ after: v0, before: v0 }],
            },
            [
                {
                    steps: getLastStepInPath(["a", 1], inputGrammar),
                    values: [{ after: v0, before: v0 }],
                },
            ],
            [],
            defaultConditionSelection,
            "parallel",
            () => ({ type: "raw", value: 3 }),
            inputGrammar
        )
        expect(grammar).to.deep.equal(toHierarchical(parse("a --> 1 | 2 | 3")))
    })

    it("should do nothing with no selection", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const [v1, v2] = [mockValue([0, 1]), mockValue([1, 2])]
        const { grammar } = await insert(
            {
                "a@test,1,0": [
                    { after: v1, before: v1 },
                    { after: v2, before: v2 },
                ],
            },
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | this * 2 -> this + 3`
        )
    })

    it("should insert before at noun", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 2 + 1 -> ( 1 | this * 2 -> this + 3 )`
        )
    })

    it("should insert before at substep", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | 2 + 1 -> this * 2 -> this + 3`
        )
    })

    it("should insert parallel at substep", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | this * 2 -> this + 3 | 2 + 1`
        )
    })

    it("should insert parallel at noun", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await insert(
            {},
            [{ steps: getLastStepInPath(["a@test"], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> 1 | this * 2 -> this + 3 | 2 + 1`
        )
    })

    it("should replace step", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await replace(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> 1 | this * this -> this + 3`
        )
    })

    it("should replace step with selection", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const [v1, v2] = [mockValue([0]), mockValue([1, 1, 1])]
        const { grammar } = await replace(
            {
                "a@test,1,0,1": [
                    { after: v1, before: v1 },
                    { after: v2, before: v2 },
                ],
            },
            [
                {
                    steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar),
                    values: [{ after: v2, before: v2 }],
                },
            ],
            [idPatternType],
            defaultConditionSelection,
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> 1 | this * if id( ) == "1,1,1" then { this } else { 2 } -> this + 3`
        )
    })

    it("should multi replace step", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | this * 2 -> this + 3`, "test"))
        const { grammar } = await replace(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1, 0, 1], inputGrammar), values: [] },
                { steps: getLastStepInPath(["a@test", 0], inputGrammar), values: [] },
            ],
            [idPatternType],
            defaultConditionSelection,
            () => ({
                type: "this",
            }),
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> this | this * this -> this + 3`
        )
    })

    it("should remove step from parallel", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> this | b * 2 -> this + 3\nb --> 2`, "test"))
        const { grammar } = await removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 0], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> b * 2 -> this + 3\nb --> 2`
        )
    })

    it("should remove step with selection", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> this | b * 2 -> this + 3\nb --> 2`, "test"))
        const [v1, v2] = [mockValue([0]), mockValue([2, 1])]
        const { grammar } = await removeStep(
            {
                "a@test,0": [
                    { after: v1, before: v1 },
                    { after: v2, before: v2 },
                ],
            },
            [
                {
                    steps: getLastStepInPath(["a@test", 0], inputGrammar),
                    values: [{ after: v1, before: v1 }],
                },
            ],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> if id( ) == "0" then { null } else { this } | b * 2 -> this + 3\nb --> 2`
        )
    })

    it("should remove step from sequential and simplify", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 -> drive() -> 2`, "test"))
        const { grammar } = await removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a --> 1 -> 2`)
    })

    it("should multi remove step from sequential and simplify", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 -> test() -> drive() -> 2`, "test"))
        const { grammar } = await removeStep(
            {},
            [
                { steps: getLastStepInPath(["a@test", 1], inputGrammar), values: [] },
                { steps: getLastStepInPath(["a@test", 2], inputGrammar), values: [] },
            ],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a --> 1 -> 2`)
    })

    it("should not remove step from if condition", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> if this > 5 then { 22 } else { this + 2 }`, "test"))
        const { grammar } = await removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 0], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> if this > 5 then { 22 } else { this + 2 }`
        )
    })

    it("should remove step from operation", async () => {
        const inputGrammar = toHierarchical(
            parseDescription(`a --> if this > 5 then { operation( "abc", 3 ) } else { this + 2 }`, "test")
        )
        const { grammar } = await removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 1], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
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
            `a --> if this > 5 then { operation( "abc", null ) } else { this + 2 }`
        )
    })

    it("should remove step from if by replacing in multiplication", async () => {
        const inputGrammar = toHierarchical(
            parseDescription(`a --> 1 | b * if true then { "123" } else { 3 } -> this + 3\nb --> 2`, "test")
        )
        const { grammar } = await removeStep(
            {},
            [{ steps: getLastStepInPath(["a@test", 1, 0, 1, 1], inputGrammar), values: [] }],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> 1 | b * if true then { this } else { 3 } -> this + 3\nb --> 2`
        )
    })

    it("should remove step at noun", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | b -> this + 3\nb --> 2`, "test"))
        const { grammar } = await removeStep(
            {},
            [{ steps: "b@test", values: [] }],
            [idPatternType],
            defaultConditionSelection,
            {},
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(`a --> 1 | this + 3`)
    })
})

describe("noun", () => {
    it("should rename noun", async () => {
        const inputGrammar = toHierarchical(parseDescription(`a --> 1 | b * 2 -> this + 3\nb --> 2`, "test"))
        const { grammar } = await renameNoun(
            {},
            [{ steps: "b@test", values: [] }],
            [idPatternType],
            defaultConditionSelection,
            "xyz@test",
            inputGrammar
        )
        expect(() => validateHierarchical(grammar)).to.not.throw()
        expect(serializeString(grammar, localizeStepsSerializer.bind(null, "test"))).to.equal(
            `a --> 1 | xyz * 2 -> this + 3\nxyz --> 2`
        )
    })

    it("should copy noun", () => {
        const globalDescription = parse(
            `a@1 --> b@2 | a@1 | 1 -> 2\nb@2 --> k@4 | m@3\nm@3 --> c@3\nc@3 --> k@4\nk@4 --> 22`
        )
        expect(serializeString(globalDescription.concat(copyNoun(globalDescription, "b", "2", "3")))).to.equal(
            `a@1 --> b@2 | a@1 | 1 -> 2\nb@2 --> k@4 | m@3\nm@3 --> c@3\nc@3 --> k@4\nk@4 --> 22\nb@3 --> k@3 | m@3\nk@3 --> 22`
        )
    })

    it("should copy noun with recursive references", () => {
        const globalDescription = parse(
            `a@1 --> b@2 | a@1 | 1 -> 2\nb@2 --> k@4 | m@3\nm@3 --> c@3\nc@3 --> k@4\nk@4 --> b@2`
        )
        expect(serializeString(globalDescription.concat(copyNoun(globalDescription, "b", "2", "3")))).to.equal(
            `a@1 --> b@2 | a@1 | 1 -> 2\nb@2 --> k@4 | m@3\nm@3 --> c@3\nc@3 --> k@4\nk@4 --> b@2\nb@3 --> k@3 | m@3\nk@3 --> b@3`
        )
    })
})

describe("pattern", () => {
    it("should get undefined as selection condition as all values are selected", async () => {
        const condition = await getMatchingCondition([], [], [allPatternType, idPatternType], () =>
            Promise.resolve(generateAllPattern())
        )
        expect(condition?.generateStep).to.be.undefined
    })

    it("should get undefined as selection condition as no pattern matched", async () => {
        const values: Array<Value<undefined>> = [
            {
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
        const condition = await getMatchingCondition(
            values,
            [values[1]],
            [allPatternType, idPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep).to.be.undefined
    })

    it("should get undefined as selection condition as no value was selected", async () => {
        const values: Array<Value<undefined>> = [
            {
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
        const condition = await getMatchingCondition(
            values,
            [],
            [allPatternType, idPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep).to.be.undefined
    })

    it("should get undefined as selection condition as no condition was selected", async () => {
        const values: Array<Value<undefined>> = [
            {
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
        const condition = await getMatchingCondition(
            values,
            [values[0], values[1]],
            [idPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep).to.be.undefined
    })

    it("should get id selection condition", async () => {
        const values: Array<Value<undefined>> = [
            {
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
        const condition = await getMatchingCondition(
            values,
            [values[0], values[1]],
            [idPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep!()).to.be.deep.equal({
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

    it("should get matching modulo index selection condition", async () => {
        const values: Array<Value<undefined>> = [
            {
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
                index: [2],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                index: [3],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getMatchingCondition(
            values,
            [values[1], values[3]],
            [indexModuloPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep!()).to.be.deep.equal({
            type: "equal",
            children: [
                {
                    type: "modulo",
                    children: [
                        {
                            type: "operation",
                            identifier: "index",
                            children: [],
                        },
                        {
                            type: "raw",
                            value: 2,
                        },
                    ],
                },
                {
                    type: "raw",
                    value: 1,
                },
            ],
        })
    })

    it("should get containing modulo index selection condition", async () => {
        const values: Array<Value<undefined>> = [
            {
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
                index: [2],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
            {
                index: [3],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getContainingCondition(
            values,
            [values[1]],
            [indexModuloPatternType],
            defaultConditionSelection
        )
        expect(condition?.generateStep!()).to.be.deep.equal({
            type: "equal",
            children: [
                {
                    type: "modulo",
                    children: [
                        {
                            type: "operation",
                            identifier: "index",
                            children: [],
                        },
                        {
                            type: "raw",
                            value: 2,
                        },
                    ],
                },
                {
                    type: "raw",
                    value: 1,
                },
            ],
        })
    })

    it("should get custom selection condition", async () => {
        const customCondition: ParsedTransformation = {
            type: "raw",
            value: false,
        }
        const values: Array<Value<undefined>> = [
            {
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
                index: [2],
                invalid: {
                    observable: EMPTY,
                    value: false,
                },
                raw: undefined,
                symbolDepth: {},
                variables: {},
            },
        ]
        const condition = await getMatchingCondition(values, [values[1], values[2]], [idPatternType], () =>
            Promise.resolve({
                generateStep: () => customCondition,
                description: "",
                isSelected: () => true,
            })
        )
        expect(condition?.generateStep!()).to.be.deep.equal(customCondition)
    })

    it("should get selection condition based on domain specific pattern", async () => {
        const values: Array<Value<string>> = [
            {
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
        const condition = await getMatchingCondition(
            values,
            [values[0], values[2], values[3]],
            [
                {
                    generateMatching: (allValues, selectedValues) =>
                        computePattern(
                            () => "test",
                            allValues,
                            selectedValues,
                            (value) => value.raw,
                            (value) => ({
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
                            (newSelectionValues) => patternIsMatching(allValues, selectedValues, newSelectionValues)
                        ),
                    generateContaining: () => {
                        throw new Error("method not implemented")
                    },
                },
            ],
            defaultConditionSelection
        )
        expect(condition?.generateStep!()).to.be.deep.equal({
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
