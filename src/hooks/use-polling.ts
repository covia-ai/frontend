import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { RunStatus } from "@/lib/covia";

export function usePolling(ms: number, status: string) {
    const router = useRouter()

    useEffect(() => {
        console.log("From usePolling "+status)
        if(status == RunStatus.PENDING) {
            const intervalId = setInterval(() => {
            router.refresh()
        }, ms)
        
        return () => clearInterval(intervalId)
       }
    }, [])
}