import { parse } from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"

describe("parse grammar", () => {
    it("should parse grammars from test-data", () => {
        for (const { parsed, unparsed } of parsedAndUnparsedGrammarPairs) {
            expect(parse(unparsed)).to.deep.equal(parsed)
        }
    })
})
