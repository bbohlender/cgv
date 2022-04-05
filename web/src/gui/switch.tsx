import { AbstractParsedSwitch, HierarchicalInfo, HierarchicalParsedSteps, ParsedSwitch, serializeStepString } from "cgv"
import { UseBaseStore, useBaseStore } from "../global"
import { DeleteIcon } from "../icons/delete"
import { BlurInput } from "./blur-input"
import { StartLabel } from "./label"
import { stringToConstant } from "./util"

export function GUISwitchStep({ value }: { value: AbstractParsedSwitch<HierarchicalInfo> }) {
    const store = useBaseStore()
    return (
        <div className="d-flex flex-column mb-3 mx-3">
            <StartLabel
                onClick={store.getState().select.bind(null, value.children[0])}
                value="Condition"
                className="pointer mb-3">
                <div className="flex-grow-1 text-end px-2">{serializeStepString(value.children[0])}</div>
            </StartLabel>
            {value.children.slice(1).map((child, i) => (
                <div key={i} className="d-flex flex-row align-items-center border-bottom mb-3">
                    <BlurInput
                        className="form-control form-control-sm"
                        type="text"
                        value={value.cases[i]}
                        onBlur={(e) =>
                            store.getState().replace(value, {
                                ...value,
                                cases: value.cases.map((currentValue, value) =>
                                    i === value ? stringToConstant(e.target.value) : currentValue
                                ),
                            })
                        }
                    />
                    <div className="flex-grow-1 ms-2 p-3 pointer" onClick={store.getState().select.bind(null, child)}>
                        {serializeStepString(child)}
                    </div>
                    <div
                        onClick={() => {
                            store.getState().replace(value, {
                                ...value,
                                children: value.children.filter((_, index) => i + 1 != index),
                                cases: value.cases.filter((_, index) => i != index),
                            })
                        }}
                        className="d-flex align-items-center ms-2 btn btn-sm btn-outline-danger">
                        <DeleteIcon />
                    </div>
                </div>
            ))}
            <div onClick={() => addCase(value, store)} className="btn btn-outline-success">
                Add Case
            </div>
        </div>
    )
}

function addCase(value: AbstractParsedSwitch<HierarchicalInfo>, store: UseBaseStore) {
    store.getState().replace(value, {
        ...value,
        children: [...value.children, { type: "this" }],
        cases: [...value.cases, 0],
    })
}
