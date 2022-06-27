import { multilineStringWhitespace, parse, serializeString } from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"

describe("serialize grammar", () => {
    it("should serialize grammars from test-data", () => {
        for (const { parsed, unparsed } of parsedAndUnparsedGrammarPairs) {
            expect(serializeString(parsed)).to.equal(unparsed.replace(/\s*\n\s*/g, " "))
        }
    })

    it("should serialize prettified and re-parse description from test-data", () => {
        for (const { parsed } of parsedAndUnparsedGrammarPairs) {
            expect(parse(serializeString(parsed, undefined, multilineStringWhitespace))).to.deep.equal(parsed)
        }
    })

    it("should serialize grammar with new-lines and indentations", () => {
        expect(
            serializeString(
                parse("a-->1*2|if 1>2+2+3 then{do(123)}else{donothing(this, {10%: 33})}"),
                undefined,
                multilineStringWhitespace
            )
        ).to.equal(
            `a -->
\t1 * 2 |
\tif
\t\t1 > 2 + 2 + 3
\tthen {
\t\tdo( 123 )
\t} else {
\t\tdonothing(
\t\t\tthis,
\t\t\t{ 10%: 33 }
\t\t)
\t}`
        )
    })
})
