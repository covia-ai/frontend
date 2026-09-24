import { ListPageSkeleton } from "@/components/route-states/ListPageSkeleton";

// The Suspense boundary for every page in the app shell that has no loading
// file of its own. Several pages read useSearchParams(), which opts them out
// of prerendering up to the nearest boundary — with this one, that is the page
// content only, and the shell around it is still server-rendered.
export default function Loading() {
  return <ListPageSkeleton label="page" />;
}
