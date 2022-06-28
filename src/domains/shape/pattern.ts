import {
    allPatternType,
    computePattern,
    idPatternType,
    indexGreaterEqualPatternType,
    indexModuloPatternType,
    indexPatternType,
    indexSmallerEqualPatternType,
    patternIsMatching,
    PatternType,
} from "../../editor"
import { Value } from "../../interpreter"
import { Primitive } from "./primitive"
import { getDirection } from "./primitive-utils"

const getValueDirectionKey = (value: Value<Primitive>) => getDirection(value.raw.matrix)

export const directionSelectionPattern: PatternType<Primitive> = {
    generateMatching: (allValues, selectedValues) =>
        computePattern(
            (keys) => (keys == null ? `all directions` : `direction is in ${keys.join(", ")}`),
            allValues,
            selectedValues,
            getValueDirectionKey,
            (value) => ({
                type: "equal",
                children: [
                    {
                        type: "operation",
                        children: [],
                        identifier: "direction",
                    },
                    {
                        type: "raw",
                        value: getValueDirectionKey(value),
                    },
                ],
            }),
            (newSelectionValues) => patternIsMatching(allValues, selectedValues, newSelectionValues)
        ),

    generateContaining: (allValues, selectedValues) =>
        computePattern(
            (keys) => (keys == null ? "all directions" : `direction is in ${keys.join(", ")}`),
            allValues,
            selectedValues,
            getValueDirectionKey,
            (value) => ({
                type: "equal",
                children: [
                    {
                        type: "operation",
                        children: [],
                        identifier: "direction",
                    },
                    {
                        type: "raw",
                        value: getValueDirectionKey(value),
                    },
                ],
            })
        ),
}

export const patterns: Array<PatternType<Primitive>> = [
    allPatternType,
    indexModuloPatternType,
    indexGreaterEqualPatternType,
    indexSmallerEqualPatternType,
    directionSelectionPattern,
    idPatternType,
    indexPatternType,
]
