import { AbstractParsedOperation, HierarchicalInfo, ParsedOperation, ParsedSteps } from "cgv"
import { Draft } from "immer"
import { GUIVector3 } from "./vector3"

export function GUILineStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    if (value.children[0].type !== "operation" || value.children[1].type !== "operation") {
        return null
    }
    return (
        <>
            <GUIVector3<"operation">
                className="mb-3 d-flex flex-row mx-3"
                defaultValue={0}
                getSubstep={(draft) => draft.children[0]}
                value={value.children[0]}
            />
            <GUIVector3<"operation">
                className="mb-3 d-flex flex-row mx-3"
                defaultValue={0}
                getSubstep={(draft) => draft.children[0]}
                value={value.children[1]}
            />
        </>
    )
}
