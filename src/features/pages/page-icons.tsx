"use client"
import { useState } from "react"
import {
  BookOpen, Brain, Bug, Building2, Calendar, CalendarDays, Camera, ChartBar, ClipboardList, Clapperboard, Coffee, Columns3, Compass,
  DollarSign, FileText, FlaskConical, Flame, Folder, Gift, Globe, GraduationCap, Hand, Handshake, HeartPulse, House, Key, Laptop,
  Layers, LayoutTemplate, Lightbulb, Link2, ListTodo, Lock, Map as MapIcon, Megaphone, MessageSquare, Music, Notebook, Package,
  Palette, Plane, Puzzle, Receipt, Repeat, Rocket, Ruler, Search, Settings, Shield, Smartphone, SquareCheck, Sprout, Star, Table2,
  Target, Trophy, Truck, User, Users, Wrench, Zap, Bell, Mail, type LucideIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Page icons are stored as "i:<name>". Older pages may still hold an emoji, which keeps rendering as text.
export const ICONS: Record<string, LucideIcon> = {
  "file-text": FileText, notebook: Notebook, "book-open": BookOpen, "clipboard-list": ClipboardList, calendar: Calendar,
  "calendar-days": CalendarDays, target: Target, rocket: Rocket, lightbulb: Lightbulb, flame: Flame, star: Star, trophy: Trophy,
  brain: Brain, message: MessageSquare, megaphone: Megaphone, bell: Bell, mail: Mail, lock: Lock, key: Key, wrench: Wrench,
  settings: Settings, flask: FlaskConical, bug: Bug, puzzle: Puzzle, compass: Compass, map: MapIcon, building: Building2,
  house: House, globe: Globe, sprout: Sprout, coffee: Coffee, palette: Palette, film: Clapperboard, music: Music, camera: Camera,
  laptop: Laptop, phone: Smartphone, "square-check": SquareCheck, "list-todo": ListTodo, dollar: DollarSign, receipt: Receipt,
  handshake: Handshake, users: Users, user: User, search: Search, link: Link2, package: Package, truck: Truck, plane: Plane,
  graduation: GraduationCap, health: HeartPulse, zap: Zap, layers: Layers, table: Table2, board: Columns3, chart: ChartBar,
  repeat: Repeat, hand: Hand, template: LayoutTemplate, ruler: Ruler, shield: Shield, folder: Folder, gift: Gift,
}

export const iconKey = (name: string) => `i:${name}`

export const RenderIcon = ({ value, className }: { value: string; className?: string }) => {
  if (value.startsWith("i:")) {
    const Icon = ICONS[value.slice(2)] ?? FileText
    return <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />
  }
  return <span className={cn("shrink-0 text-[15px] leading-none", className)} aria-hidden="true">{value}</span>
}

export const IconPicker = ({ value, onChange, children, allowClear = true }: {
  value?: string | null
  onChange: (icon: string | null) => void
  children: React.ReactNode
  allowClear?: boolean
}) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              aria-label={`Use the ${name.replace(/-/g, " ")} icon`}
              onClick={() => { onChange(iconKey(name)); setOpen(false) }}
              className={cn("flex size-8 items-center justify-center rounded-md text-ink/75 hover:bg-cream-deep hover:text-brand", value === iconKey(name) && "bg-brand/15 text-brand")}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
        {allowClear && value && (
          <Button type="button" variant="ghost" size="sm" className="mt-2 h-8 w-full text-xs" onClick={() => { onChange(null); setOpen(false) }}>
            Remove icon
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
