// Small standalone module (no LiveKit imports) so the meeting page can use it without loading the call code.
export type TranscriptSegment = { t: number; speaker: string; text: string }

// "<epoch ms>\t<speaker>\t<text>" per line, the format the server stores and merges
export const segmentsToBody = (segments: TranscriptSegment[]) =>
    segments
        .map(s => `${s.t}\t${s.speaker.replace(/[\t\n]/g, " ")}\t${s.text.replace(/[\t\n]/g, " ")}`)
        .join("\n")

// The room hands this person's utterances over right before onDisconnect fires.
let lastSegments: TranscriptSegment[] = []
export const setLastSegments = (segments: TranscriptSegment[]) => {
    lastSegments = segments
}
export const takeLastSegments = () => {
    const out = lastSegments
    lastSegments = []
    return out
}
