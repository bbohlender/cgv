import { expect } from "chai"
import chaiAsPromised from "chai-as-promised"
import { interprete, parse } from "../src"
import { lastValueFrom } from "rxjs"
chai.use(chaiAsPromised)

describe("interprete grammar", () => {
    it("should interprete sequential execution", () => {
        const result = interprete(parse(`a -> 10 this * 10 this + 1`))
        expect(lastValueFrom(result)).to.eventually.equal([1, 6, 8])
    })

    it("should interprete parallel execution", () => {
        const result = interprete(parse(`a -> 1 | 2 * 3 | 2 4 * 2`))
        expect(lastValueFrom(result)).to.eventually.equal([1, 6, 8])
    })

    it("should interprete grammars with recursion (that eventually terminate)", () => {

    })

    it("should throw an error with unterminating recursive grammars", () => {
        const result = interprete(parse(`a -> 1 | 10 a | 2`))
        expect(lastValueFrom(result)).to.eventually.throw("")
    })

    it("should interprete complex grammars", () => {})
})
