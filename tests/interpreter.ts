import chai, { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { applyChangeToMatrix, ChangeType, interprete, Matrix, parse, toArray, toValue, Value } from "../src"
import { asyncScheduler, delay, EMPTY, lastValueFrom, of, scheduled } from "rxjs"
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

describe("array datastructure", () => {
    it("should handle changes from observable and output the updated array", async () => {
        await expect(
            lastValueFrom(
                scheduled<Value<number>>(
                    [
                        {
                            raw: 4,
                            index: [0],
                            invalid: of(null).pipe(delay(100)),
                            variables: {},
                        },
                        {
                            raw: 3,
                            index: [1, 0],
                            invalid: EMPTY,
                            variables: {},
                        },
                        {
                            raw: 2,
                            index: [1, 1],
                            invalid: of(null).pipe(delay(200)),
                            variables: {},
                        },
                        {
                            raw: 1,
                            index: [10],
                            invalid: EMPTY,
                            variables: {},
                        },
                    ],
                    asyncScheduler
                ).pipe(toArray())
            )
        ).to.eventually.deep.equal({
            index: [],
            raw: [3, 1],
            variables: {},
            invalid: null
        })
    })
})

describe("interprete grammar", () => {
    //TODO: test delayed interpretion
    //TODO: test chaning values

    it("should interprete sequential execution", async () => {
        const result = of(1).pipe(toValue(), interprete(parse(`a -> 10 this * 10 this + 1`), {}), toArray())
        await expect(lastValueFrom(result)).to.eventually.equal([101])
    })

    it("should interprete parallel execution", async () => {
        const result = of(1).pipe(toValue(), interprete(parse(`a -> 1 | 2 * 3 | 2 4 * 2`), {}), toArray())
        await expect(lastValueFrom(result)).to.eventually.equal([1, 6, 8])
    })

    it("should interprete grammars with recursion (that eventually terminate)", async () => {
        const result = of(4).pipe(
            toValue(),
            interprete(parse(`a -> if (this == 0) then 0 else (1 | this - 1 a)`), {}),
            toArray()
        )
        await expect(lastValueFrom(result)).to.eventually.equal([1, 1, 1, 1, 0])
    })

    it("should throw an error with unterminating recursive grammars", async () => {
        const result = of(1).pipe(toValue(), interprete(parse(`a -> 1 | 10 a | 2`), {}), toArray())
        await expect(lastValueFrom(result)).to.eventually.throw("")
    })

    it("should interprete complex grammars", async () => {
        const result = of(0).pipe(
            toValue(),
            interprete(
                parse(
                    `   a -> 2 switch a case 0: b case 1: c
                        b -> if true then (this * 10 c) else c
                        c -> (c * d | d) return 100
                        d -> this / 2 this * 2`
                ),
                {}
            ),
            toArray()
        )
        await expect(lastValueFrom(result)).to.eventually.equal([400, 20])
    })
})
