import { AbstractParsedOperation, createDefaultStep, HierarchicalInfo } from "cgv"
import { BlurInput } from "../../../gui/blur-input"
import { useBaseStore } from "../../../global"
import { EndLabel, StartLabel } from "../../../gui/label"
import { AxisInput } from "./axis-input"
import { useCallback } from "react"
import { operations } from "cgv/domains/shape"

export function GUISplitSteps({ value }: { value: AbstractParsedOperation<HierarchicalInfo> }) {
    const [child1, child2, child3] = value.children
    const axis = child1.type === "raw" ? child1.value : undefined
    const splitSize = child2.type === "raw" ? child2.value : undefined
    const limit = child3?.type === "raw" ? child3.value : undefined
    const store = useBaseStore()
    const setLimit = useCallback(
        (limit: number | undefined) => {
            store.getState().replace(
                () => ({
                    ...value,
                    children:
                        limit == null || isNaN(limit)
                            ? [child1, child2]
                            : [child1, child2, { type: "raw", value: limit }],
                }),
                value
            )
        },
        [store, value]
    )
    return (
        <div className="d-flex flex-column mx-3">
            <EndLabel value="Multiple" className="mb-3">
                <input
                    className="min-w-0 form-check-input"
                    type="checkbox"
                    checked={false}
                    onChange={() =>
                        store
                            .getState()
                            .replace(
                                () => createDefaultStep({ type: "operation", identifier: "multiSplit" }, operations),
                                value
                            )
                    }
                />
            </EndLabel>
            <StartLabel value="Axis" className="mb-3 ">
                <AxisInput
                    value={axis}
                    onChange={(e) =>
                        store.getState().replace(() => ({ type: "raw", value: e.currentTarget.value }), child1)
                    }
                    className="flex-grow-1 w-auto form-select form-select-sm"
                />
            </StartLabel>
            <StartLabel value="Size" className="mb-3">
                <BlurInput
                    className="min-w-0 form-control form-control-sm"
                    type="number"
                    value={splitSize ?? 10}
                    onBlur={(e) =>
                        store.getState().replace(() => ({ type: "raw", value: e.target.valueAsNumber }), child2)
                    }
                />
            </StartLabel>
            <EndLabel value="Repeat" className="mb-3">
                <input
                    className="min-w-0 form-check-input"
                    type="checkbox"
                    checked={limit != 1}
                    onChange={(e) => setLimit(e.target.checked ? undefined : 1)}
                />
            </EndLabel>
            {limit != 1 && (
                <EndLabel value="Limit Splitting" className="mb-3">
                    <input
                        className="min-w-0 form-check-input"
                        type="checkbox"
                        checked={limit != null}
                        onChange={(e) => setLimit(e.target.checked ? 2 : undefined)}
                    />
                </EndLabel>
            )}
            {limit != null && limit != 1 && (
                <StartLabel value="Limit to" className="mb-3">
                    <BlurInput
                        className="min-w-0 form-control form-control-sm"
                        type="number"
                        value={limit}
                        onBlur={(e) => setLimit(isNaN(e.target.valueAsNumber) ? 10 : e.target.valueAsNumber)}
                    />
                </StartLabel>
            )}
        </div>
    )
}
