import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useStore } from "../../../global"
import { DeleteIcon } from "../../../icons/delete"
import { GUI3ValueOperationStep } from "./point"

const PointInFace = GUI3ValueOperationStep.bind(null, "point", 0, "d-flex flex-row")

export function GUIFaceSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const store = useStore()
    return (
        <div className="d-flex flex-column mx-3">
            {value.children.map((child) => (
                <div className="d-flex flex-row align-items-center mb-3">
                    {child.type === "operation" && <PointInFace value={child} />}
                    <div
                        onClick={() => store.getState().remove(child)}
                        className="ms-2 d-flex align-items-center btn-sm btn btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                className="btn btn-outline-success mb-3"
                onClick={() =>
                    store.getState().change(value, {
                        ...value,
                        children: [
                            ...value.children,
                            {
                                type: "operation",
                                identifier: "point",
                                children: [
                                    { type: "raw", value: 0 },
                                    { type: "raw", value: 0 },
                                    { type: "raw", value: 0 },
                                ],
                            },
                        ],
                    })
                }>
                Add Point
            </div>
        </div>
    )
}
