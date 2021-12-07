import { Grammar, Parser } from "nearley"
import grammar from "./parser"

const G = Grammar.fromCompiled(grammar)

export default function parse<T>(text: string): [T | undefined, string] {
    const parser = new Parser(G)
    try {
        parser.feed(text)
        if (parser.results.length === 0) {
            return [undefined, "unexpected end of input"]
        }
        return [parser.results[0], ""]
    } catch (error: any) {
        return [undefined, error.message]
    }
}
