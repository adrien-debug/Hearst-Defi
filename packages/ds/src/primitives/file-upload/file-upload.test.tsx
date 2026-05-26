import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { FileUpload } from "./file-upload";

function mkFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("FileUpload", () => {
  afterEach(() => cleanup());

  it("renders dropzone with default copy", () => {
    render(<FileUpload onFiles={() => {}} />);
    expect(
      screen.getByText(/drag files here|click to browse/i),
    ).toBeTruthy();
    expect(screen.getByLabelText("File upload dropzone")).toBeTruthy();
  });

  it("rejects files that exceed maxSize", () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <FileUpload onFiles={onFiles} onReject={onReject} maxSize={10} />,
    );
    const input = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement;
    const big = mkFile("big.bin", "application/octet-stream", 1024);
    fireEvent.change(input, { target: { files: [big] } });
    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalled();
  });

  it("renders controlled files with progress and remove button", () => {
    const onItemRemove = vi.fn();
    render(
      <FileUpload
        onFiles={() => {}}
        files={[
          {
            id: "1",
            file: mkFile("hello.png", "image/png", 100),
            progress: 0.5,
          },
        ]}
        onItemRemove={onItemRemove}
      />,
    );
    expect(screen.getByText("hello.png")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Remove hello.png"));
    expect(onItemRemove).toHaveBeenCalledWith("1");
  });
});
