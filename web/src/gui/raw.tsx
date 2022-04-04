import { AbstractParsedRaw, HierarchicalInfo, ParsedRaw, replaceStep } from "cgv"
import { useState, useEffect } from "react"
import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"
import { stringToConstant } from "./util"

export function GUIRawStep({ value }: { value: AbstractParsedRaw<HierarchicalInfo> }): JSX.Element {
    const store = useBaseStore()
    return (
        <BlurInput
            value={value.value}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) => store.getState().replace(value, { type: "raw", value: stringToConstant(e.target.value) })}
        />
    )
}
