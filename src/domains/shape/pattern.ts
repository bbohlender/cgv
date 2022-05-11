import { idSelectionPattern, SelectionPattern } from "../../editor"
import { Primitive } from "./primitive"
import { getDirection } from "./primitive-utils"

export const directionSelectionPattern: SelectionPattern<Primitive, any> = {
    getConditionKey: (value) => getDirection(value.raw.matrix),
    getConditionStep: (value) => ({
        type: "equal",
        children: [
            {
                type: "operation",
                identifier: "direction",
                children: [],
            },
            {
                type: "raw",
                value: getDirection(value.raw.matrix),
            },
        ],
    }),
}

export const patterns: Array<SelectionPattern<Primitive, any>> = [directionSelectionPattern, idSelectionPattern]
