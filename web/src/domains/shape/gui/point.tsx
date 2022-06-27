import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { GUIVector2, GUIVector3 } from "./vector"

export const GUIPoint3Step = ({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) =>
    GUIVector3<"operation">({
        className: "mb-3 d-flex flex-row mx-3",
        defaultValue: 0,
        getSubstep: (draft) => draft,
        value,
    })

export const GUIPoint2Step = ({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) =>
    GUIVector2<"operation">({
        className: "mb-3 d-flex flex-row mx-3",
        defaultValue: 0,
        getSubstep: (draft) => draft,
        value,
    })
