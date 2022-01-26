import { Attribute, AttributeType, NumberAttribute } from "cgv/domains/shape"
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo } from "react"

export function AttributeInput({
    parameters,
    id,
    name,
    attribute,
    setParameters,
}: {
    id: string
    setParameters: Dispatch<SetStateAction<InstanceParameters>>
    parameters: InstanceParameters
    attribute: Attribute
    name: string
}) {
    const path = useMemo(() => `${id}/${name}`, [id, name])
    const setValue = useCallback(
        (value: number | undefined) => {
            if (value == null) {
                setParameters((parameters) => {
                    const { [path]: _, ...rest } = parameters
                    return rest
                })
            } else {
                setParameters((parameters) => ({
                    ...parameters,
                    [path]: value,
                }))
            }
        },
        [setParameters, path]
    )
    const value = parameters[path]
    return (
        <div className="ms-3 mt-1 d-flex flex-column">
            <div className="mb-3 d-flex flex-row align-items-center">
                <input
                    className="form-check-input mt-0"
                    type="checkbox"
                    onChange={(e) =>
                        setValue(attribute.type !== AttributeType.Enum && !e.target.checked ? attribute.min : undefined)
                    }
                    checked={parameters[path] == null}
                />
                <label className="form-check-label ms-3">Randomize</label>
            </div>
            {value != null && attribute.type !== AttributeType.Enum && (
                <IntInput value={value} attribute={attribute} setValue={setValue} />
            )}
        </div>
    )
}

function IntInput({
    value,
    setValue,
    attribute,
}: {
    value: number
    setValue: (value: number | undefined) => void
    attribute: NumberAttribute
}) {
    const setParsed = useCallback(
        (value: number) => {
            const rounded = attribute.type === AttributeType.Int ? Math.round(value) : value
            setValue(inRange(rounded, attribute.min, attribute.max))
        },
        [attribute.min, attribute.max, attribute.type, setValue]
    )
    const setUnparsed = useCallback(
        (value: string) => setParsed(nanToDefault(parseFloat(value), attribute.min)),
        [setParsed, attribute.min]
    )
    useEffect(() => {
        if (value != null) {
            setParsed(value)
        }
    }, [setParsed, value])
    return (
        <>
            <input
                type="number"
                disabled={value == null}
                onChange={(e) => setUnparsed(e.target.value)}
                value={value ?? attribute.min}
                className="form-control"
                aria-label="Text input with checkbox"
            />
            <input
                type="range"
                className="form-range mt-3"
                min={attribute.min}
                max={attribute.max}
                value={value ?? attribute.min}
                onChange={(e) => setUnparsed(e.target.value)}
                step={attribute.type === AttributeType.Int ? 1 : (attribute.max - attribute.min) / 100}
            />
        </>
    )
}

function inRange(val: number, min: number, max: number): number {
    return Math.max(Math.min(max, val), min)
}

function nanToDefault(val: number, def: number): number {
    return isNaN(val) ? def : val
}
