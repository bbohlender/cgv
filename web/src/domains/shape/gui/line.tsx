import { AbstractParsedOperation, HierarchicalInfo, assureType } from "cgv"
import { GUIVector2, GUIVector3 } from "./vector"

export function GUILineStep({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    if (value.children[0].type !== "operation" || value.children[1].type !== "operation") {
        return null
    }
    return (
        <>
            {value.children[0].identifier === "point3" ? (
                <GUIVector3<"operation">
                    className="mb-3 d-flex flex-row mx-3"
                    defaultValue={0}
                    getSubstep={(draft) => assureType("operation", draft.children[0])}
                    value={value}
                />
            ) : (
                <GUIVector2<"operation">
                    className="mb-3 d-flex flex-row mx-3"
                    defaultValue={0}
                    getSubstep={(draft) => assureType("operation", draft.children[0])}
                    value={value}
                />
            )}
            {value.children[1].identifier === "point3" ? (
                <GUIVector3<"operation">
                    className="mb-3 d-flex flex-row mx-3"
                    defaultValue={0}
                    getSubstep={(draft) => assureType("operation", draft.children[1])}
                    value={value}
                />
            ) : (
                <GUIVector2<"operation">
                    className="mb-3 d-flex flex-row mx-3"
                    defaultValue={0}
                    getSubstep={(draft) => assureType("operation", draft.children[1])}
                    value={value}
                />
            )}
        </>
    )
}
