/* for later:
export type Domain = {
    operations: Operations<any>
    getConstant: (identifier: string) => any
    getType: (value: any) => string
}*/

import { of } from "rxjs"
import { Operations, simpleExecution } from "../interpreter"

export const defaultOperations: Operations<any, any> = {
    index: {
        execute: (value) => {
            const index = value.index[value.index.length - 1] ?? 0
            return of([
                {
                    ...value,
                    raw: index,
                },
            ])
        },
        includeThis: false,
        defaultParameters: [],
    },
    select: {
        execute: (value) => {
            const index = value.index[value.index.length - 1] ?? 0
            const [current, min, max] = value.raw
            return of(
                min <= index && (max == null || index < max)
                    ? [
                          {
                              ...value,
                              raw: current,
                          },
                      ]
                    : []
            )
        },
        includeThis: true,
        defaultParameters: [() => ({ type: "raw", value: 1 }), () => ({ type: "raw", value: 2 })],
    },
    random: {
        execute: simpleExecution((min: number, max: number) => of([min + (max - min) * Math.random()])),
        includeThis: false,
        defaultParameters: [() => ({ type: "raw", value: 0 }), () => ({ type: "raw", value: 1 })],
    },
}
