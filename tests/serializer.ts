import { serializeString } from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"

describe("serialize grammar", () => {
    it("should serialize grammars from test-data", () => {
        for (const { parsed, unparsed } of parsedAndUnparsedGrammarPairs) {
            expect(serializeString(parsed)).to.equal(unparsed.replace(/\s*\n\s*/g, " "))
        }
    })
})