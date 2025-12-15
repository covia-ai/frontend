import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RunStatus } from "@covia-ai/covialib";

export function usePolling(ms: number, status: string) {
    const router = useRouter()

    useEffect(() => {
        if(status == RunStatus.PENDING) {
            const intervalId = setInterval(() => {
            router.refresh()
        }, ms)
        
        return () => clearInterval(intervalId)
       }
    }, [])
}