import { HTMLProps, useCallback, useEffect, useRef, useState } from "react"
import { CheckIcon } from "../icons/check"

export function SuccessButton({
    asyncFn,
    shortcutKey,
    className,
    children,
    ...rest
}: HTMLProps<HTMLDivElement> & { shortcutKey: string; asyncFn: () => Promise<void> }) {
    const [timeoutRef, setTimeoutRef] = useState<number | undefined>(undefined)
    const ref = useRef<number>()
    ref.current = timeoutRef
    const onClick = useCallback(async () => {
        await asyncFn()
        setTimeoutRef(setTimeout(() => setTimeoutRef(undefined), 1000) as any)
    }, [asyncFn])
    useEffect(() => {
        const listener = (e: KeyboardEvent) => {
            if (e.key === shortcutKey && e.ctrlKey) {
                e.stopPropagation()
                e.preventDefault()
                onClick()
            }
        }
        window.addEventListener("keydown", listener)
        return () => {
            ref.current != null ? clearTimeout(ref.current) : undefined //clear timeout
            window.removeEventListener("keydown", listener)
        }
    }, [])
    if (timeoutRef != null) {
        return (
            <div {...rest} className={`${className} btn btn-success h1 btn-outline-success btn-sm text-light`}>
                <CheckIcon />
            </div>
        )
    }
    return (
        <div {...rest} className={`${className} btn btn-sm`} onClick={onClick}>
            {children}
        </div>
    )
}

export function PasteButton({
    onPaste,
    ...rest
}: HTMLProps<HTMLDivElement> & { onPaste: (text: string) => Promise<void> }) {
    return (
        <SuccessButton
            {...rest}
            shortcutKey="v"
            asyncFn={async () => {
                const text = await navigator.clipboard.readText()
                await onPaste(text)
            }}
        />
    )
}
export function CopyButton({ onCopy, ...rest }: HTMLProps<HTMLDivElement> & { onCopy: () => string }) {
    return (
        <SuccessButton
            {...rest}
            shortcutKey="c"
            asyncFn={async () => {
                const text = onCopy()
                await navigator.clipboard.writeText(text)
            }}
        />
    )
}
