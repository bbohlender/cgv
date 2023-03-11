import { generateUUID } from "three/src/math/MathUtils"
import { ParsedDescription, ParsedNoun, ParsedTransformation, ParsedVerse } from "."

export class Processor {
    private descriptions: Array<ParsedDescription> = []
    private nouns: { [Id in string]: ParsedNoun } = {}
    private transformations: { [Id in string]: ParsedTransformation } = {}

    addNoun(name: string, rootTransformationId: string): string {
        const id = generateUUID()
        this.nouns[id] = {
            name,
            rootTransformationId,
        }
        return id
    }

    addTransformation(transformation: ParsedTransformation): string {
        const id = generateUUID()
        this.transformations[id] = transformation
        return id
    }

    addDescription(name: string, nounIds: Array<string>, parameters: Array<[string, any]>): void {
        this.descriptions.push({
            name,
            rootNounId: nounIds[0],
            nounIds,
            config: parameters.reduce((prev, [name, value]) => ({ ...prev, [name]: value }), {}),
        })
    }

    getResult(): ParsedVerse {
        return {
            descriptions: this.descriptions,
            nouns: this.nouns,
            transformations: this.transformations,
        }
    }
}
