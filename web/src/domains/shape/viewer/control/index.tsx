import { HierarchicalParsedSteps } from "cgv"
import { useBaseStore } from "../../../../global"
import { MultiplePoint2Control, MultiplePoint3Control } from "./multiple-points"
import { Point2Control, Point3Control } from "./point"

export function Control() {
    const store = useBaseStore()
    const selectionsList = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsList : undefined
    )
    if (selectionsList == null) {
        return null
    }
    return (
        <>
            {selectionsList.map((selections) => (
                <OperationControl key={selections.steps.path.join(",")} value={selections.steps} />
            ))}
        </>
    )
}

function OperationControl({ value }: { value: HierarchicalParsedSteps }) {
    if (value.type != "operation") {
        return null
    }
    switch (value.identifier) {
        case "point3":
            return <Point3Control getSubstep={(draft) => draft} value={value} />
        case "point2":
            return <Point2Control getSubstep={(draft) => draft} value={value} />
        case "face":
            return <MultiplePoint2Control value={value} />
        case "line":
            return <MultiplePoint3Control value={value} />
        default:
            return null
    }
}
