import { cn } from "@/utils/style";

type Props = React.ComponentProps<"div">;

export function Copyright({ className, ...props }: Props) {
  return <div className={cn("text-xs leading-relaxed text-muted-foreground/80", className)} {...props} />;
}
