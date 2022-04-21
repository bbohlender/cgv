import { AbstractParsedOperation, HierarchicalInfo, assureType } from "cgv"
import { GUIVector3 } from "./vector"

export function GUILineStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    if (value.children[0].type !== "operation" || value.children[1].type !== "operation") {
        return null
    }
    return (
        <>
            <GUIVector3<"operation">
                className="mb-3 d-flex flex-row mx-3"
                defaultValue={0}
                getSubstep={(draft) => assureType("operation", draft.children[0])}
                value={value}
            />
            <GUIVector3<"operation">
                className="mb-3 d-flex flex-row mx-3"
                defaultValue={0}
                getSubstep={(draft) => assureType("operation", draft.children[0])}
                value={value}
            />
        </>
    )
}
