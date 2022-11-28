import { AbstractParsedRaw, HierarchicalInfo } from "cgv"
import { BlurInput } from "./blur-input"
import { useBaseStore } from "../global"
import { stringToConstant } from "./util"

export function GUIRawStep({ step }: { step: AbstractParsedRaw<HierarchicalInfo> }): JSX.Element {
    const store = useBaseStore()
    return (
        <BlurInput
            value={step.value}
            className="mx-3 mb-3 w-auto form-control form-control-sm"
            onBlur={(e) =>
                store.getState().edit<"raw">({
                    mode: "replace",
                    stepGenerator: (path, draft) => {
                        draft.value = stringToConstant(e.target.value)
                    },
                    steps: step,
                })
            }
        />
    )
}
