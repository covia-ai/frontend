import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SITE_NOTICE_REFRESH_MS, SiteNoticeBanner } from "@/components/SiteNoticeBanner";

const URL_ = "https://example.com/notice.json";
const originalFetch = global.fetch;

const serve = (...bodies: unknown[]) => {
  const fetchMock = jest.fn();
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) });
  }
  global.fetch = fetchMock as never;
  return fetchMock;
};

const heightVar = () => document.documentElement.style.getPropertyValue("--site-notice-h");

describe("SiteNoticeBanner", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("does nothing when no notice URL is configured", () => {
    const fetchMock = serve();
    const { container } = render(<SiteNoticeBanner url={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the message as plain text with a safe More info link", async () => {
    serve({
      message: "<b>venue-1</b> is down",
      level: "warning",
      link: "https://status.example.com/1",
    });
    render(<SiteNoticeBanner url={URL_} />);

    const banner = await screen.findByTestId("site-notice");
    expect(banner).toHaveAttribute("role", "status");
    expect(banner).toHaveTextContent("<b>venue-1</b> is down");
    expect(banner.querySelector("b")).toBeNull();

    const link = screen.getByTestId("site-notice-link");
    expect(link).toHaveAttribute("href", "https://status.example.com/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("announces an outage as an alert", async () => {
    serve({ message: "venue-1 is down", level: "outage" });
    render(<SiteNoticeBanner url={URL_} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Outage: venue-1 is down");
  });

  it("shows nothing when the file is invalid or unreachable", async () => {
    const fetchMock = serve({ message: "x", level: "nope" });
    const { container } = render(<SiteNoticeBanner url={URL_} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("publishes its height for the layout offset and clears it when dismissed", async () => {
    serve({ message: "Maintenance tonight", level: "info" });
    render(<SiteNoticeBanner url={URL_} />);
    await screen.findByTestId("site-notice");
    // jsdom has no layout, so the height is 0px, but the variable is set.
    expect(heightVar()).toBe("0px");

    await userEvent.click(screen.getByTestId("site-notice-dismiss"));
    expect(screen.queryByTestId("site-notice")).not.toBeInTheDocument();
    expect(heightVar()).toBe("");
  });

  it("keeps a dismissed warning hidden on reload in the same session", async () => {
    const notice = { message: "Slow responses", level: "warning" };
    serve(notice);
    const first = render(<SiteNoticeBanner url={URL_} />);
    await userEvent.click(await screen.findByTestId("site-notice-dismiss"));
    first.unmount();

    const fetchMock = serve(notice);
    const { container } = render(<SiteNoticeBanner url={URL_} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("brings a dismissed outage back on reload", async () => {
    const notice = { message: "venue-1 is down", level: "outage" };
    serve(notice);
    const first = render(<SiteNoticeBanner url={URL_} />);
    await userEvent.click(await screen.findByTestId("site-notice-dismiss"));
    expect(screen.queryByTestId("site-notice")).not.toBeInTheDocument();
    first.unmount();

    serve(notice);
    render(<SiteNoticeBanner url={URL_} />);
    expect(await screen.findByTestId("site-notice")).toBeInTheDocument();
  });

  it("picks up a newly posted notice on the next refresh", async () => {
    jest.useFakeTimers();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, text: () => Promise.resolve("") })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ message: "Now posted", level: "info" })),
      });
    global.fetch = fetchMock as never;

    render(<SiteNoticeBanner url={URL_} />);
    await act(async () => {});
    expect(screen.queryByTestId("site-notice")).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(SITE_NOTICE_REFRESH_MS);
    });
    expect(screen.getByTestId("site-notice")).toHaveTextContent("Now posted");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("hides itself when `until` passes", async () => {
    jest.useFakeTimers();
    const until = new Date(Date.now() + 60_000).toISOString();
    serve({ message: "Brief maintenance", level: "info", until });

    render(<SiteNoticeBanner url={URL_} />);
    await act(async () => {});
    expect(screen.getByTestId("site-notice")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.queryByTestId("site-notice")).not.toBeInTheDocument();
  });
});
