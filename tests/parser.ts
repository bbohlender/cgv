import { parse } from "../src"
import { expect } from "chai"
import { parsedAndUnparsedGrammarPairs } from "./test-data"

describe("parse grammar", () => {
    it("should parse grammars from test-data", () => {
        for (const { parsed, unparsed } of parsedAndUnparsedGrammarPairs) {
            expect(parse(unparsed)).to.deep.equal(parsed)
        }
    })

    it("should efficiently parse big grammar", () => {
        expect(() => parse(`Start -> face(
            point2(10,90),
            point2(-30,0),
            point2(80,10),
            point2(60,60)
        ) -> Lot
        
        Lot -> color("#333343") -> extrude(60) -> toFaces() -> (select(0, 4) -> Wall | select(4, 5) -> Roof)
        
        Wall -> split("z", 20) -> Floor
        
        Roof -> color("#881111")
        
        Floor -> split("x", 20) -> WindowFrame
        
        WindowFrame -> if size("x") >= 20
            then {
                multiSplit("x", 5, 10) -> switch index() {
                    case 0: this
                    case 1:
                        multiSplit("z", 5, 10) -> switch index() {
                            case 0: this
                            case 1: Window
                            case 2: this
                        }
                    case 2: this
                }
            } else {
                this
            }
        
        Window -> color("#EEEEEE")`)).to.not.throw()
    }).timeout(500)
})
