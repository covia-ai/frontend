import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

const mockNotifyError = jest.fn();
jest.mock("@/lib/notify", () => ({
  notifyError: (...args: unknown[]) => mockNotifyError(...args),
}));

const mockVenue: any = {
  baseUrl: "https://venue.example",
  metadata: { name: "Test Venue" },
  dlfs: {
    listDrives: jest.fn(),
    list: jest.fn(),
    getContent: jest.fn(),
  },
  workspace: {
    read: jest.fn().mockResolvedValue({ exists: false, value: undefined }),
  },
};

jest.mock("@/hooks/use-authenticated-venue", () => ({
  useAuthenticatedVenue: () => mockVenue,
}));

import { FilesExplorer } from "@/components/FilesExplorer";

// jsdom has no global ReadableStream — a minimal manual mock exposing just
// what useFilePreview/readTextStream actually call (getReader().read()).
function mockStreamOf(chunk: Uint8Array): ReadableStream<Uint8Array> {
  let read = false;
  return {
    getReader: () => ({
      read: () => {
        if (read) return Promise.resolve({ value: undefined, done: true });
        read = true;
        return Promise.resolve({ value: chunk, done: false });
      },
      cancel: () => Promise.resolve(),
    }),
  } as unknown as ReadableStream<Uint8Array>;
}

function streamOf(text: string): ReadableStream<Uint8Array> {
  return mockStreamOf(new TextEncoder().encode(text));
}

function bytesOf(): ReadableStream<Uint8Array> {
  return mockStreamOf(new Uint8Array([1, 2, 3]));
}

describe("FilesExplorer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVenue.workspace.read.mockResolvedValue({ exists: false, value: undefined });
    (global as any).URL.createObjectURL = jest.fn(() => "blob:mock-url");
    (global as any).URL.revokeObjectURL = jest.fn();
  });

  it("lists drives and defaults to the first one", async () => {
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault", "notes"] });
    mockVenue.dlfs.list.mockResolvedValue({ entries: [] });
    render(<FilesExplorer />);

    expect(await screen.findByText("vault")).toBeInTheDocument();
    expect(screen.getByText("notes")).toBeInTheDocument();
    await waitFor(() => expect(mockVenue.dlfs.list).toHaveBeenCalledWith("vault", undefined));
  });

  it("navigates into a directory and lists its entries", async () => {
    const user = userEvent.setup();
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockImplementation((drive: string, path?: string) => {
      if (!path) return Promise.resolve({ entries: [{ name: "docs", type: "directory" }] });
      return Promise.resolve({ entries: [{ name: "note.txt", type: "file", size: 5 }] });
    });
    render(<FilesExplorer />);

    await user.click(await screen.findByText("docs"));

    expect(await screen.findByText("note.txt")).toBeInTheDocument();
    await waitFor(() => expect(mockVenue.dlfs.list).toHaveBeenCalledWith("vault", "docs"));
  });

  it("renders pretty-printed JSON content for a .json file", async () => {
    const user = userEvent.setup();
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockResolvedValue({ entries: [{ name: "data.json", type: "file", size: 20 }] });
    mockVenue.dlfs.getContent.mockResolvedValue(streamOf('{"a":1}'));

    render(<FilesExplorer />);
    await user.click(await screen.findByText("data.json"));

    await waitFor(() => expect(mockVenue.dlfs.getContent).toHaveBeenCalledWith("vault", "data.json"));
    const textarea = await screen.findByDisplayValue(/"a": 1/);
    expect(textarea).toBeInTheDocument();
  });

  it("renders an image preview from a blob URL", async () => {
    const user = userEvent.setup();
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockResolvedValue({ entries: [{ name: "photo.png", type: "file", size: 100 }] });
    mockVenue.dlfs.getContent.mockResolvedValue(bytesOf());

    render(<FilesExplorer />);
    await user.click(await screen.findByText("photo.png"));

    const img = await screen.findByRole("img", { name: "photo.png" });
    expect(img).toHaveAttribute("src", "blob:mock-url");
  });

  it("does not fetch content for an unrecognised file until Download is clicked", async () => {
    const user = userEvent.setup();
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockResolvedValue({ entries: [{ name: "archive.zip", type: "file", size: 999 }] });
    mockVenue.dlfs.getContent.mockResolvedValue(bytesOf());

    render(<FilesExplorer />);
    await user.click(await screen.findByText("archive.zip"));

    const downloadButton = await screen.findByRole("button", { name: /download/i });
    expect(mockVenue.dlfs.getContent).not.toHaveBeenCalled();

    await user.click(downloadButton);
    await waitFor(() => expect(mockVenue.dlfs.getContent).toHaveBeenCalledWith("vault", "archive.zip"));
  });

  it("shows a permission-denied listing error, not a crash", async () => {
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockRejectedValue(new Error("HTTP 403: Capability denied: requires crud/read on dlfs/vault"));

    render(<FilesExplorer />);
    expect(await screen.findByText("Access denied")).toBeInTheDocument();
  });

  it("shows the WebDAV card with the mount caveat when enabled", async () => {
    mockVenue.dlfs.listDrives.mockResolvedValue({ drives: ["vault"] });
    mockVenue.dlfs.list.mockResolvedValue({ entries: [] });
    mockVenue.workspace.read.mockResolvedValue({
      exists: true,
      value: { webdav: { enabled: true, url: "https://venue.example/dlfs" } },
    });

    render(<FilesExplorer />);
    expect(await screen.findByText("WebDAV URL")).toBeInTheDocument();
    expect(screen.getByText(/public identity/i)).toBeInTheDocument();
    const code = screen.getByText("https://venue.example/dlfs/vault");
    expect(within(code.parentElement!.parentElement!).getByLabelText(/copy webdav url/i)).toBeInTheDocument();
  });
});
