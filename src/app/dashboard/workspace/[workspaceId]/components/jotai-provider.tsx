"use client"


import {Provider} from "jotai"


interface JotaiProviderProps {
    children: React.ReactNode
}

export const JotaiProvider = ({children}: {children: React.ReactNode}) => {
    return (
        <Provider>
            {children}
        </Provider>
    )
}