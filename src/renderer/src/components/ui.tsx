import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon, type IconName } from "./Icon";
import { cn } from "../lib/format";

/* ------------------------------------------------------------------ buttons */

type ButtonVariant = "primary" | "ghost" | "subtle" | "danger" | "link";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
}

export function Button({
  variant = "ghost",
  size = "md",
  icon,
  iconRight,
  block,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn("btn", `btn--${variant}`, `btn--${size}`, block && "btn--block", className)}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
      <span>{children}</span>
      {iconRight ? <Icon name={iconRight} size={size === "sm" ? 14 : 16} /> : null}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: { icon: IconName; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn("icon-btn", className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  );
}

/* ------------------------------------------------------------------ chips */

export function Chip({
  children,
  tone = "plain",
  icon,
  className,
}: {
  children: ReactNode;
  tone?: "plain" | "mint" | "blue" | "violet" | "amber" | "red";
  icon?: IconName;
  className?: string;
}) {
  return (
    <span className={cn("chip", `chip--${tone}`, className)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function StatusDot({ state }: { state: "ok" | "warn" | "bad" | "idle" }) {
  return <span className={cn("status-dot", `status-dot--${state}`)} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ form */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("field", className)}>
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-wrap">
      <select className={cn("input select", className)} {...rest}>
        {children}
      </select>
      <Icon name="chevronDown" size={14} />
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={cn("toggle", checked && "toggle--on")}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__thumb" />
    </button>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <input
      type="range"
      className="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

export function SettingRow({
  title,
  body,
  children,
  className,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("setting-row", className)}>
      <div className="setting-row__copy">
        <b>{title}</b>
        {body ? <span>{body}</span> : null}
      </div>
      <div className="setting-row__control">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ surfaces */

export function Panel({
  title,
  action,
  children,
  className,
  tone,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "mint" | "blue" | "warn";
}) {
  return (
    <section className={cn("panel", tone && `panel--${tone}`, className)}>
      {title || action ? (
        <header className="panel__head">
          <span className="panel__title">{title}</span>
          {action}
        </header>
      ) : null}
      <div className="panel__body">{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  back,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  back?: () => void;
}) {
  return (
    <header className="page-head">
      <div className="page-head__copy">
        {back ? (
          <button className="back-link" onClick={back} type="button">
            <Icon name="arrowLeft" size={14} />
            <span>Back</span>
          </button>
        ) : null}
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="page-title">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__art" aria-hidden="true">
        <span className="empty__ring" />
        <span className="empty__ring empty__ring--two" />
        <span className="empty__icon">
          <Icon name={icon} size={26} />
        </span>
      </div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("skeleton", className)} aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} style={{ width: `${88 - index * 9}%` }} />
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="divider" />;
}

export function ProgressBar({
  value,
  tone = "mint",
  indeterminate,
}: {
  value: number;
  tone?: "mint" | "blue" | "amber" | "red";
  indeterminate?: boolean;
}) {
  return (
    <div className={cn("progress", `progress--${tone}`, indeterminate && "progress--indeterminate")}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ overlays */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal"
            style={{ width }}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <header className="modal__head">
              <h2>{title}</h2>
              <IconButton icon="close" label="Close" onClick={onClose} />
            </header>
            <div className="modal__body">{children}</div>
            {footer ? <footer className="modal__foot">{footer}</footer> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.aside
            className="drawer"
            aria-label={label}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            <IconButton icon="close" label="Close" className="drawer__close" onClick={onClose} />
            {children}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
