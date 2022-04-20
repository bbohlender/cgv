import { AbstractParsedOperation, HierarchicalInfo } from "cgv"
import { useBaseStore } from "../../../global"
import { DeleteIcon } from "../../../icons/delete"
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
                            getSubstep={(draft) => draft.children[i]}
                            value={child}
                        />
                    )}
                    <div
                        onClick={() =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children.splice(i, 1)
                            })
                        }
                        className="ms-2 d-flex align-items-center btn-sm btn btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div
                className="btn btn-outline-success mb-3"
                onClick={() =>
                    store.getState().replace<"operation">((draft) => {
                        draft.children.push({
                            type: "operation",
                            identifier: "point2",
                            children: [
                                { type: "raw", value: 0 },
                                { type: "raw", value: 0 },
                            ],
                        })
                    })
                }>
                Add Point
            </div>
        </div>
    )
}
