import { AbstractParsedRaw, HierarchicalInfo, ParsedRaw, replaceStep } from "cgv"
import { useState, useEffect } from "react"
import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"

export function GUIRawStep({ value }: { value: AbstractParsedRaw<HierarchicalInfo> }): JSX.Element {
    const store = useBaseStore()
    return (
        <BlurInput
            value={value.value}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) => {
                const integer = parseInt(e.target.value)
                let newValue: any
                if (!isNaN(integer)) {
                    newValue = integer
                } else if (e.target.value === "true" || e.target.value === "false") {
                    newValue = e.target.value === "true"
                } else {
                    newValue = e.target.value
                }
                store.getState().change(value, { type: "raw", value: newValue })
            }}
        />
    )
}
