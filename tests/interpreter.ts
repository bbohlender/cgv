import chai, { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import {
    applyChangeToMatrix,
    ChangeType,
    createInvalidator,
    interprete,
    Invalid,
    Matrix,
    parse,
    toArray,
    toValue,
    Value,
} from "../src"
import {
    asyncScheduler,
    EMPTY,
    filter,
    lastValueFrom,
    map,
    of,
    scheduled,
    take,
    timer,
    toArray as collectInArray,
} from "rxjs"
chai.use(chaiAsPromised)

describe("matrix datastructure", () => {
    it("should handle changes and update matrix", () => {
        let matrix: Matrix<number> = undefined
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.SET,
            index: [],
            value: 22,
        })
        expect(matrix).to.deep.equal(22)
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.SET,
            index: [2],
            value: 7,
        })
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.SET,
            index: [4],
            value: 3,
        })
        expect(matrix).to.deep.equal([undefined, undefined, 7, undefined, 3])
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.UNSET,
            index: [4],
        })
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.SET,
            index: [0, 1],
            value: 4,
        })
        expect(matrix).to.deep.equal([[undefined, 4], undefined, 7])
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.UNSET,
            index: [2],
        })
        expect(matrix).to.deep.equal([[undefined, 4]])
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.UNSET,
            index: [0, 0],
        })
        expect(matrix).to.deep.equal([[undefined, 4]])
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.UNSET,
            index: [0],
        })
        expect(matrix).to.deep.equal(undefined)
        matrix = applyChangeToMatrix(matrix, {
            type: ChangeType.SET,
            index: [1, 0],
            value: 4,
        })
        expect(matrix).to.deep.equal([undefined, [4]])
    })
})

function createCompletedInvalid(): Invalid {
    return {
        value: false,
        observable: EMPTY,
    }
}

function createInvalidAndInvalidateAfter(ms: number) {
    const invalidator = createInvalidator()
    setTimeout(invalidator.invalidate, ms)
    return invalidator
}

describe("array datastructure", () => {
    it("should handle changes from observable and output the updated array", async () => {
        await expect(
            lastValueFrom(
                scheduled<Value<number>>(
                    [
                        {
                            raw: 4,
                            index: [0],
                            invalid: createInvalidAndInvalidateAfter(100),
                            variables: {},
                        },
                        {
                            raw: 3,
                            index: [1, 0],
                            invalid: createCompletedInvalid(),
                            variables: {},
                        },
                        {
                            raw: 2,
                            index: [1, 1],
                            invalid: createInvalidAndInvalidateAfter(200),
                            variables: {},
                        },
                        {
                            raw: 1,
                            index: [10],
                            invalid: createCompletedInvalid(),
                            variables: {},
                        },
                        {
                            raw: 2,
                            index: [10, 0],
                            invalid: createCompletedInvalid(),
                            variables: {},
                        },
                    ],
                    asyncScheduler
                ).pipe(
                    toArray(),
                    map((values) => values.map(({ raw, index, variables }) => ({ raw, index, variables })))
                )
            )
        ).to.eventually.deep.equal([
            {
                raw: 3,
                index: [1, 0],
                variables: {},
            },
            {
                raw: 2,
                index: [10, 0],
                variables: {},
            },
        ])
    })
})

describe("interprete grammar", () => {
    it("should interprete sequential execution", async () => {
        const result = of(1).pipe(
            toValue(),
            interprete(parse(`a -> 10 this * 10 this + 1`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([101])
    })

    it("should interprete parallel execution", async () => {
        const result = of(1).pipe(
            toValue(),
            interprete(parse(`a -> 1 | 2 * 3 | 2 4 * 2`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([1, 6, 8])
    })

    it("should interprete grammars with recursion (that eventually terminate)", async () => {
        const result = of(4).pipe(
            toValue(),
            interprete(parse(`a -> if (this == 0) then 0 else (1 | this - 1 a)`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([1, 1, 1, 1, 0])
    }).timeout(5000)

    it("should not throw an error caused by recursion since a return is used before the recursion", async () => {
        const result = of(22).pipe(
            toValue(),
            interprete(parse(`a -> return a`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([22])
    })

    it("should interprete complex grammars", async () => {
        const result = of(0).pipe(
            toValue(),
            interprete(
                parse(
                    `   a -> 2 switch this case 2: b case 3: c
                        b -> if true then (this * 10 c) else c
                        c -> (20 * d | d) return 100
                        d -> this / 2 this * 2`
                ),
                {}
            ),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([400, 20])
    })

    it("should re-interprete complex grammar with changing values", async () => {
        const result = timer(300, 300).pipe(
            take(4),
            map((v) => v + 1), //1,2,3,4
            toValue(),
            interprete(
                parse(
                    `   a -> switch this case 1: b case 2: b case 3: c
                        b -> if (this == 1) then (this * 10 c) else c
                        c -> (20 * d | d) return 100
                        d -> this / 2 this * 2`
                ),
                {}
            ),
            toArray(true),
            filter((values) => values.length === 2),
            map((values) => values.map(({ raw }) => raw)),
            collectInArray()
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([
            [200, 10],
            [40, 2],
            [60, 3],
        ])
    })

    it("should interprete complex grammar with delays", async () => {
        const result = of(0).pipe(
            toValue(),
            interprete(
                parse(
                    `   a -> 2 switch this case 2: b case 3: c
                        b -> if true then (this * 10 c) else c
                        c -> (20 * d | d) return 100
                        d -> this / 2 this * 2`
                ),
                {},
                20
            ),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.eventually.deep.equal([400, 20])
    })

    it("should handle external variable changes", async () => {
        const result = of<Value<number>>({
            raw: 0,
            invalid: createCompletedInvalid(),
            index: [],
            variables: {
                x: timer(300, 300).pipe(
                    take(3) //0,1,2
                ),
            },
        }).pipe(
            interprete(
                parse(` a -> this.x * b | 2 + this.x
                        b -> 3 + 2`),
                {}
            ),
            toArray(),
            filter((values) => values.length === 2),
            map((values) => values.map(({ raw }) => raw)),
            collectInArray()
        )

        await expect(lastValueFrom(result)).to.eventually.deep.equal([
            [0, 2],
            [5, 3],
            [10, 4],
        ])
    })

    it("should throw an error with unterminating recursive grammars", async () => {
        const result = of(1).pipe(
            toValue(),
            interprete(parse(`a -> 1 | 10 a | 2`), {}, undefined, 50),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.be.eventually.rejectedWith(
            `maximum symbol depth (50) reached for symbol "a"`
        )
    }).timeout(100000)

    it("should throw an error when using unknown symbol", async () => {
        const result = of(1).pipe(
            toValue(),
            interprete(parse(`a -> 1 | 10 b | 2`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.be.eventually.rejectedWith(`unknown symbol "b"`)
    })

    it("should throw an error when using unknown operator", async () => {
        const result = of(1).pipe(
            toValue(),
            interprete(parse(`a -> 1 | 10 drive() | 2`), {}),
            toArray(),
            map((values) => values.map(({ raw }) => raw))
        )
        await expect(lastValueFrom(result)).to.be.eventually.rejectedWith(`unknown operation "drive"`)
    })

    //TODO: test attribute changes
})
