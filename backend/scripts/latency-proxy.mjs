/**
 * A TCP proxy that adds a fixed delay to every forwarded packet, to imitate a database that is a
 * network hop away rather than on localhost.
 *
 * Local Postgres answers in microseconds, which hides per-query costs entirely; a hosted database
 * answers in milliseconds, which multiplies them by the number of round trips. Point the app at
 * this proxy to see what a query count actually costs in production.
 *
 * Usage: node latency-proxy.mjs --listen=5433 --target=5432 --delay=3
 */
import net from "node:net";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const listenPort = Number(args.listen ?? 5433);
const targetPort = Number(args.target ?? 5432);
const delayMs = Number(args.delay ?? 3);

let packets = 0;

net
  .createServer((client) => {
    const upstream = net.connect(targetPort, "127.0.0.1");
    const pipe = (from, to) =>
      from.on("data", (chunk) => {
        packets += 1;
        setTimeout(() => to.write(chunk), delayMs);
      });
    pipe(client, upstream);
    pipe(upstream, client);
    const close = () => {
      client.destroy();
      upstream.destroy();
    };
    client.on("error", close);
    upstream.on("error", close);
    client.on("close", close);
    upstream.on("close", close);
  })
  .listen(listenPort, () => {
    console.log(`delaying ${delayMs}ms per packet: localhost:${listenPort} -> localhost:${targetPort}`);
  });

process.on("SIGINT", () => {
  console.log(`packets forwarded: ${packets}`);
  process.exit(0);
});
