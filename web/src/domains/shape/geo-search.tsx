import { HTMLProps, useCallback, useEffect, useMemo, useState } from "react"
import { debounceTime, EMPTY, filter, from, Subject, switchMap, tap } from "rxjs"
import { useViewerState } from "./viewer/state"

export const locations: Array<{ title: string; lat: number; lon: number }> = [
    {
        title: "721 9th Ave, New York, NY 10019",
        lat: 40.7628862,
        lon: -73.9894495,
    },
    {
        title: "Feuerbachstraße 25, 60325 Frankfurt am Main",
        lat: 50.1157581,
        lon: 8.6629498,
    },
]

export function GeoSearch({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    return (
        <div {...rest} className={`${className} bg-light border rounded shadow`}>
            <div className="py-2 px-3 border-bottom border-2">Adresses</div>
            {locations.map(({ title, lat, lon }) => (
                <div
                    key={title}
                    style={{ fontSize: "x-small" }}
                    className="pointer border-top py-2 px-3"
                    onClick={() => useViewerState.getState().setLatLon(lat, lon)}>
                    {title}
                </div>
            ))}
        </div>
    )
}

/*export function GeoSearch({ className, ...rest }: HTMLProps<HTMLDivElement>) {
    const [{ search, option }, setState] = useState<{
        search: string
        option: { title: string; lat: number; lon: number } | undefined
    }>({
        search: "",
        option: undefined,
    })
    const select = useCallback(() => {
        if (option == null) {
            return
        }
        setState({ search: "", option: undefined })
        useViewerState.getState().setLatLon(option.lat, option.lon)
    }, [option])
    const subject = useMemo(() => new Subject<string>(), [])
    useEffect(() => subject.next(search), [search])
    useEffect(() => {
        const subscription = subject
            .pipe(
                debounceTime(300),
                switchMap((value) => {
                    if (value.length === 0) {
                        return EMPTY
                    }
                    return from(
                        fetch(
                            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                                value
                            )}.json?limit=1&proximity=ip&types=place%2Caddress&access_token=pk.eyJ1IjoiZ2V0dGlucWRvd24iLCJhIjoiY2t2NXVjd2ZzMW51aDJvb3Y4ZnVvcHl5NCJ9.8KEVKztDoj60vRAFhO_kCA`
                        ).then((result) => result.json())
                    )
                }),
                tap(({ features }: { features: Array<{ place_name: string; center: [number, number] }> }) =>
                    setState((state) => ({
                        ...state,
                        option:
                            features.length > 0
                                ? {
                                      title: features[0].place_name,
                                      lat: features[0].center[1],
                                      lon: features[0].center[0],
                                  }
                                : undefined,
                    }))
                )
            )
            .subscribe()
        return () => subscription.unsubscribe()
    }, [])
    return (
        <div {...rest} className={`${className} p-2 bg-light border rounded shadow`}>
            <input
                onKeyDown={(e) => e.key === "Enter" && select()}
                autoFocus
                type="text"
                className="form-control form-control-sm"
                onChange={(e) => setState((state) => ({ ...state, search: e.target.value }))}
                value={search}
                placeholder="Address"
            />
            {option != null && (
                <div onClick={select} style={{ fontSize: "xx-small" }} className="pointer mx-1 mt-2">
                    {option.title}
                </div>
            )}
        </div>
    )
}
*/
