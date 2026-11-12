import { AnimatePresence, motion } from "framer-motion";
import { useUi } from "../store";
import { Icon } from "./Icon";
import { IconButton } from "./ui";

export function ToastHost() {
  const toasts = useUi((state) => state.toasts);
  const dismiss = useUi((state) => state.dismissToast);

  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <span className="toast__icon">
              <Icon
                name={toast.kind === "error" ? "alert" : toast.kind === "success" ? "check" : "info"}
                size={15}
              />
            </span>
            <span>{toast.text}</span>
            <IconButton icon="close" label="Dismiss" onClick={() => dismiss(toast.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
