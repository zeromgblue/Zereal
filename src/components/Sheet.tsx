"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { spring, useBackLayer } from "@/lib/ui";

export default function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const controls = useDragControls();
  useBackLayer(open, onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] mx-auto flex max-w-md items-end">
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[82dvh] w-full flex-col rounded-t-[28px] border-t border-line bg-card pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring}
            drag="y"
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div
              className="shrink-0 cursor-grab touch-none px-5 pb-3 pt-3"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-white/15" />
              {title && <p className="mt-3 text-center text-[15px] font-normal text-ink">{title}</p>}
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
