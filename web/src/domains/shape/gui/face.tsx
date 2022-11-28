import { AbstractParsedOperation, HierarchicalInfo, assureType, SelectedSteps } from "cgv"
import { tileMeterRatio, tileZoomRatio } from "cgv/domains/shape"
import Tooltip from "rc-tooltip"
import { UseBaseStore, useBaseStore } from "../../../global"
import { DeleteIcon } from "../../../icons/delete"
import { getPosition, useViewerState } from "../viewer/state"
import { GUIVector2 } from "./vector"

export function GUIFaceSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center mb-3">
                    {child.type === "operation" && (
                        <GUIVector2<"operation">
                            className="d-flex flex-row"
                            defaultValue={0}
                            getSubstep={(draft) => assureType("operation", draft.children[i])}
                            value={value}
                        />
                    )}
                    <Tooltip placement="left" overlay="Delete Point">
                        <div
                            onClick={() =>
                                store.getState().edit<"operation">({
                                    mode: "replace",
                                    stepGenerator: (path, draft) => {
                                        draft.children.splice(i, 1)
                                    },
                                    steps: value,
                                })
                            }
                            className="ms-2 d-flex align-items-center btn-sm btn btn-outline-danger">
                            <DeleteIcon />
                        </div>
                    </Tooltip>
                </div>
            ))}
            <div className="btn btn-outline-success mb-3" onClick={() => addPointToFace(store, value)}>
                Add Point
            </div>
        </div>
    )
}

function addPointToFace(store: UseBaseStore, step: SelectedSteps) {
    const [x, , y] = getPosition(useViewerState.getState())
    const zoomRatio = tileZoomRatio(0, 18)
    const meterRatio = tileMeterRatio(Math.round(y * zoomRatio), 18)
    const xMeter = ((x * zoomRatio) % 1) * meterRatio
    const yMeter = ((y * zoomRatio) % 1) * meterRatio
    store.getState().edit<"operation">({
        mode: "replace",
        stepGenerator: (path, draft) => {
            draft.children.push({
                type: "operation",
                identifier: "point2",
                children: [
                    { type: "raw", value: xMeter },
                    { type: "raw", value: yMeter },
                ],
            })
        },
        steps: step,
    })
}
