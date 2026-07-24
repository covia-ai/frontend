// One rule for the card grids on Operations and Assets, replacing a
// five-breakpoint class chain (grid-cols-2 md:3 lg:4 3xl:5 4xl:6).
//
// `auto-fill` rather than `auto-fit`: auto-fit collapses empty tracks, so a
// search returning two results would stretch those two cards across the whole
// row. auto-fill keeps the tracks, and two results look like the first two of
// a full row.
//
// `min(14rem,100%)` rather than a bare `14rem`: a track whose minimum exceeds
// its container overflows, which is what happens on a narrow phone. The min()
// clamps the floor to the container width.
//
// The 14rem is the only density knob — lower it for more, smaller cards per
// row, raise it for fewer, larger ones. It must stay a literal in this string:
// Tailwind scans source for complete class names, so building the class by
// interpolation would silently generate no CSS at all.
export const CARD_GRID_CLASS =
  "w-full grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] items-stretch justify-center gap-4";

// Rows to aim for per page; the column count comes from the grid itself, so
// the page size follows the window rather than a fixed 12.
export const CARD_GRID_ROWS = 4;
