"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/hooks/useTheme";

interface ToasterProps {
  position?:
    | "top-left"
    | "top-right"
    | "top-center"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center";
  duration?: number;
}

export function Toaster({ position = "top-right", duration = 3000 }: ToasterProps) {
  const { theme } = useTheme();

  return (
    <SonnerToaster
      position={position}
      theme={theme === "dark" ? "dark" : "light"}
      duration={duration}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toast]:border-green-500 group-[.toast]:bg-green-500/10",
          error: "group-[.toast]:border-red-500 group-[.toast]:bg-red-500/10",
          info: "group-[.toast]:border-blue-500 group-[.toast]:bg-blue-500/10",
          warning: "group-[.toast]:border-yellow-500 group-[.toast]:bg-yellow-500/10",
        },
      }}
    />
  );
}
