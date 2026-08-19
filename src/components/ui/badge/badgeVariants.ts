import {cva, type VariantProps} from "class-variance-authority";

export const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
                outline: "text-foreground",
                success:
                    "border-transparent bg-emerald-500/90 text-white shadow hover:bg-emerald-500/70",
                warning:
                    "border-transparent bg-amber-500/90 text-white shadow hover:bg-amber-500/70",
                info:
                    "border-transparent bg-sky-500/90 text-white shadow hover:bg-sky-500/70",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>["variant"];