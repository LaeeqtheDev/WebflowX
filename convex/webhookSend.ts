"use node"
import { v } from "convex/values"
import { internalAction } from "./_generated/server"
import https from "node:https"
import dns from "node:dns"
import net from "node:net"
import type { LookupFunction } from "node:net"

// Outgoing webhooks are sent from here (Node) rather than with fetch() so the address that gets checked is the
// address that gets connected to. The check runs inside the connection's own DNS lookup, so a host that answers
// with a public address the first time and a private one the next (DNS rebinding) is refused too.

const privateV4 = (ip: string) => {
    const p = ip.split(".").map(Number)
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true
    const [a, b] = p
    return (
        a === 0 || a === 10 || a === 127 ||
        (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
        (a === 169 && b === 254) ||           // link-local, cloud metadata
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 192 && b === 0) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224                              // multicast and reserved
    )
}

const privateV6 = (ip: string) => {
    const x = ip.toLowerCase()
    if (x === "::" || x === "::1") return true
    if (x.startsWith("fc") || x.startsWith("fd") || /^fe[89ab]/.test(x) || x.startsWith("ff")) return true
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? privateV4(mapped[1]) : false
}

const isPrivate = (address: string, family: number) => (family === 6 ? privateV6(address) : privateV4(address))

const safeLookup: LookupFunction = (hostname, options, callback) => {
    dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
        if (err) return callback(err, "", 4)
        if (addresses.length === 0 || addresses.some((a) => isPrivate(a.address, a.family))) {
            return callback(new Error("blocked address"), "", 4)
        }
        if (options.all) return callback(null, addresses)
        callback(null, addresses[0].address, addresses[0].family)
    })
}

export const post = internalAction({
    args: { url: v.string(), event: v.string(), signature: v.string(), body: v.string() },
    handler: async (_ctx, args): Promise<{ ok: boolean; status: string }> => {
        let u: URL
        try { u = new URL(args.url) } catch { return { ok: false, status: "bad address" } }
        if (u.protocol !== "https:" || (u.port && u.port !== "443") || net.isIP(u.hostname.replace(/^\[|\]$/g, "")) !== 0) {
            return { ok: false, status: "blocked address" }
        }
        return await new Promise((resolve) => {
            const req = https.request(
                {
                    protocol: "https:",
                    hostname: u.hostname,
                    port: 443,
                    path: u.pathname + u.search,
                    method: "POST",
                    lookup: safeLookup,
                    timeout: 8000,
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(args.body),
                        "User-Agent": "WebflowX-Webhooks/1",
                        "X-WebflowX-Event": args.event,
                        "X-WebflowX-Signature": args.signature,
                    },
                },
                (res) => {
                    const code = res.statusCode ?? 0
                    res.resume() // we only need the status; redirects are never followed
                    resolve({ ok: code >= 200 && code < 300, status: String(code) })
                    req.destroy()
                }
            )
            req.on("timeout", () => { resolve({ ok: false, status: "timeout" }); req.destroy() })
            req.on("error", (e) => resolve({ ok: false, status: e.message === "blocked address" ? "blocked address" : "unreachable" }))
            req.end(args.body)
        })
    },
})
