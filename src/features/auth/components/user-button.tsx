"use client"

import { useCurrentUser } from "@/app/auth/api/user-current-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator} from "@/components/ui/dropdown-menu"
import { useAuthActions } from "@convex-dev/auth/react"
import { Download, Loader, LogOut, Monitor, Moon, Sun, UserPen } from "lucide-react"
import { useSetTheme } from "@/hooks/use-theme-pref"
import { isThemePref, type ThemePref } from "@/lib/theme"
import { errMsg } from "@/lib/errors"
import { toast } from "sonner"
import { useDataExport } from "@/lib/export-data"
import { useState } from "react"
import { EditProfileModal } from "./edit-profile-modal"

export const UserButton = () => {
    const {data, isLoading} = useCurrentUser();
    const {signOut} = useAuthActions();
    const [editOpen, setEditOpen] = useState(false)
    const { exportMine, busy, progress } = useDataExport()
    const setTheme = useSetTheme()

    if(isLoading){
        return <Loader className="size-4 animate-spin text-white/60"/>
    }

    if(!data) {
        return null;
    }

    const {image, name} = data;
    const avatarFallback = (name ?? data.email ?? "?").charAt(0).toUpperCase();

    return(
        <>
        <EditProfileModal open={editOpen} setOpen={setEditOpen} user={data} />
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="outline-none relative">
                <Avatar className=" rounded-lg size-10 hover:opacity-80 transition ring-1 ring-white/15">
                    <AvatarImage className="rounded-lg" src={image}  alt={name} />
                    <AvatarFallback className="rounded-lg bg-[#ff5018] text-white font-semibold">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="center" side="right" className="w-60 rounded-xl p-1.5">
                <div className="px-2 py-2 mb-1">
                    <p className="text-sm font-semibold text-ink truncate">{name}</p>
                    {data.title && <p className="text-xs text-ink/55 truncate">{data.title}</p>}
                </div>
                <DropdownMenuItem onClick={() => setEditOpen(true)} className="h-10 rounded-lg cursor-pointer">
                    <UserPen className="size-4 mr-2" />
                    Edit profile
                </DropdownMenuItem>
                <div className="px-2 pt-1 pb-2">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink/55">Appearance</p>
                    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-lg bg-ink/5 p-1">
                        {([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "Auto", Monitor]] as const).map(([value, label, Icon]) => {
                            const current: ThemePref = isThemePref(data.theme) ? data.theme : "system"
                            const active = current === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={active}
                                    onClick={() => setTheme(value).catch((e) => toast.error(errMsg(e, "Couldn't save your theme")))}
                                    className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors ${active ? "bg-surface text-ink shadow-sm" : "text-ink/65 hover:text-ink"}`}
                                >
                                    <Icon className="size-3.5" aria-hidden />
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    disabled={busy}
                    onSelect={(e) => {
                        e.preventDefault()
                        exportMine().then(() => toast.success("Your data was downloaded")).catch(() => toast.error("Couldn't export your data. Please try again."))
                    }}
                    className="h-10 rounded-lg cursor-pointer"
                >
                    {busy ? <Loader className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
                    {busy ? progress || "Exporting…" : "Download my data"}
                </DropdownMenuItem>
                <DropdownMenuItem  onClick={()=> signOut()} className="h-10 rounded-lg cursor-pointer">
                    <LogOut className="size-4 mr-2" />
                    Logout
                </DropdownMenuItem>

            </DropdownMenuContent>

        </DropdownMenu>
        </>
    )
}