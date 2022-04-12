import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { GUIVector3 } from "./vector3"

export const GUIScaleStep = ({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) =>
    GUIVector3<"operation">({
        className: "mb-3 d-flex flex-row mx-3",
        defaultValue: 0,
        getSubstep: (draft) => draft,
        value,
    })
