import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"
import { DeleteIcon } from "../../../icons/delete"
import { GUI3ValueOperationStep } from "./point"

const PointInFace = GUI3ValueOperationStep.bind(null, "point", 0, "d-flex flex-row")

export function GUIFaceSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mx-3">
            {value.children.map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center mb-3">
                    {child.type === "operation" && <PointInFace value={child} />}
                    {/*<div
                        onClick={() => store.getState().removeStep(child)}
                        className="ms-2 d-flex align-items-center btn-sm btn btn-outline-danger">
                        <DeleteIcon />
            </div>*/}
                </div>
            ))}
            <div
                className="btn btn-outline-success mb-3"
                onClick={() =>
                    store.getState().replace(
                        () => ({
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
                        }),
                        value
                    )
                }>
                Add Point
            </div>
        </div>
    )
}
