import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { GUIPointStep } from "./point"

export function GUILineStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    if (value.children[0].type !== "operation" || value.children[1].type !== "operation") {
        return null
    }
    return (
        <>
            <GUIPointStep value={value.children[0]} />
            <GUIPointStep value={value.children[1]} />
        </>
    )
}
