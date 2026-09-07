import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={{ ["--width" as string]: "calc(100% - 2rem)" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast w-full rounded-[1.5rem] border border-border/70 bg-card/95 px-4 py-3 text-sm text-foreground shadow-lg shadow-primary/5 backdrop-blur-sm",
          title: "font-semibold text-foreground",
          description: "text-muted-foreground",
          icon: "text-primary",
          actionButton:
            "rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground",
          cancelButton: "rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
