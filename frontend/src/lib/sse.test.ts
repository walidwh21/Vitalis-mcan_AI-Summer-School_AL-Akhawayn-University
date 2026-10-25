import { describe, expect, it } from "vitest";
import { readSse } from "./sse";

const streamOf = (...chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      chunks.forEach((c) => controller.enqueue(enc.encode(c)));
      controller.close();
    },
  });

async function collect(body: ReadableStream<Uint8Array>) {
  const out = [];
  for await (const m of readSse(body)) out.push(m);
  return out;
}

describe("readSse", () => {
  it("parses named events and reassembles frames split across chunks", async () => {
    const out = await collect(streamOf('event: delta\ndata: {"te', 'xt":"Hi"}\n\nevent: done\ndata: {"id":"1"}\n\n'));
    expect(out).toEqual([
      { event: "delta", data: '{"text":"Hi"}' },
      { event: "done", data: '{"id":"1"}' },
    ]);
  });

  it("defaults the event name and flushes a trailing frame", async () => {
    expect(await collect(streamOf("data: hello"))).toEqual([{ event: "message", data: "hello" }]);
  });
});
