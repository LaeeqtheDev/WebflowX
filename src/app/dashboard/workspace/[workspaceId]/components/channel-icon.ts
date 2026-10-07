import type { ComponentType } from "react"
import {
    Sparkle20Regular,
    Star20Regular,
    Flag20Regular,
    Bookmark20Regular,
    Globe20Regular,
    Flash20Regular,
    Cube20Regular,
    Ribbon20Regular,
    Diamond20Regular,
    Camera20Regular,
    MusicNote120Regular,
    Games20Regular,
    Food20Regular,
    Trophy20Regular,
    Chat20Regular,
    Megaphone20Regular,
    People20Regular,
    Code20Regular,
    Wrench20Regular,
    BrainCircuit20Regular,
    Rocket20Regular,
    Bug20Regular,
    Map20Regular,
    Target20Regular,
    Beaker20Regular,
    DataBarVertical20Regular,
    PaintBrush20Regular,
    Heart20Regular,
    Presenter20Regular,
    Lightbulb20Regular,
} from "@fluentui/react-icons"

type IconLike = ComponentType<{ className?: string }>

/** Channel names may carry a leading emoji; the sidebar shows a clean name + icon instead. */
export const cleanChannelName = (name: string) =>
    name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || name

const MAP: [RegExp, IconLike][] = [
    [/general|random|watercooler|chat|talk/i, Chat20Regular],
    [/announce/i, Megaphone20Regular],
    [/intro|welcome|team|customer|success/i, People20Regular],
    [/front|engineer|dev|code/i, Code20Regular],
    [/back|infra|api/i, Wrench20Regular],
    [/ai|research|ml/i, BrainCircuit20Regular],
    [/deploy|release|ship/i, Rocket20Regular],
    [/bug|issue/i, Bug20Regular],
    [/roadmap/i, Map20Regular],
    [/sprint|plan|goal/i, Target20Regular],
    [/qa|test/i, Beaker20Regular],
    [/analytic|metric|data/i, DataBarVertical20Regular],
    [/design|brand/i, PaintBrush20Regular],
    [/present|demo|fyp|pitch/i, Presenter20Regular],
    [/idea|feedback/i, Lightbulb20Regular],
    [/love|kudos|thanks/i, Heart20Regular],
]

/** Deterministic pool so any user-named channel still gets its own icon. */
const POOL: IconLike[] = [
    Sparkle20Regular, Star20Regular, Flag20Regular, Bookmark20Regular, Globe20Regular,
    Flash20Regular, Cube20Regular, Ribbon20Regular, Diamond20Regular, Camera20Regular,
    MusicNote120Regular, Games20Regular, Food20Regular, Trophy20Regular,
]

const hash = (str: string) => {
    let h = 0
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
    return Math.abs(h)
}

export const channelIcon = (name: string): IconLike => {
    const clean = cleanChannelName(name)
    return MAP.find(([re]) => re.test(clean))?.[1] ?? POOL[hash(clean.toLowerCase()) % POOL.length]
}
