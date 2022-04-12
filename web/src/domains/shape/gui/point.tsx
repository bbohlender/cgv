import { AbstractParsedOperation, HierarchicalInfo, ParsedOperation, ParsedSteps } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useBaseStore } from "../../../global"
import { Draft } from "immer"
import { GUIVector3 } from "./vector3"

export const GUIPointStep = ({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) =>
    GUIVector3<"operation">({
        className: "mb-3 d-flex flex-row mx-3",
        defaultValue: 0,
        getSubstep: (draft) => draft,
        value,
    })
