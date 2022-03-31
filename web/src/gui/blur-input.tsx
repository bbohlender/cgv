import { HTMLProps, useEffect, useState } from "react"

export function BlurInput({ value, ...rest }: HTMLProps<HTMLInputElement> & { value: any }) {
    const [raw, setRaw] = useState(value)
    useEffect(() => setRaw(value), [value])
    return (
        <input
            {...rest}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
    )
}
