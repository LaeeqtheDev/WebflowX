import { ChannelIcon, cleanChannelName } from "./channel-icon";
import {format} from "date-fns"

interface ChannelHeroProps {
    name: string;
    creationTime: number;
}

export const ChannelHero = ({name, creationTime}: ChannelHeroProps) => {
    const clean = cleanChannelName(name);
    return (
        <div className="mt-22 mx-5 mb-6">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-2xl font-semibold text-orange-ink mb-4">
                <ChannelIcon name={name} className="size-7" />
            </div>
            <p className="text-3xl font-semibold tracking-tight text-ink flex items-center mb-2">
                {clean}
            </p>
            <p className="font-normal text-ink/60 max-w-xl leading-relaxed mb-4">
                This channel was created on {format(creationTime ,"MMMM do, yyyy")}. This is the very beginning of the <strong className="font-semibold text-ink">{clean}</strong> channel.

            </p>
        </div>
    )
}