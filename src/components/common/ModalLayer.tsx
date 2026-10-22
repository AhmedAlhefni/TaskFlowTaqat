import React, { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

type LayerEntry = { element: HTMLDivElement; close: () => void; restoreFocus: Element | null };
const stack: LayerEntry[] = [];
let previousBodyOverflow = "";
let rootWasInert = false;

const refreshStack = () => {
  stack.forEach((entry, index) => {
    entry.element.style.zIndex = String(1000 + index * 10);
    entry.element.inert = index !== stack.length - 1;
  });
  const root = document.getElementById("root");
  if (root) root.inert = stack.length > 0;
};

export const ModalLayer: React.FC<{
  children: React.ReactNode;
  onClose: () => void;
  dismissible?: boolean;
}> = ({ children, onClose, dismissible = true }) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  closeRef.current = onClose;
  dismissibleRef.current = dismissible;

  useLayoutEffect(() => {
    const element = layerRef.current;
    if (!element) return;
    if (stack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      rootWasInert = document.getElementById("root")?.inert ?? false;
    }
    const entry: LayerEntry = { element, close: () => closeRef.current(), restoreFocus: document.activeElement };
    stack.push(entry);
    refreshStack();
    const focusables = element.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    (focusables[0] || element).focus();
    return () => {
      const index = stack.indexOf(entry);
      if (index >= 0) stack.splice(index, 1);
      refreshStack();
      if (stack.length === 0) {
        document.body.style.overflow = previousBodyOverflow;
        const root = document.getElementById("root");
        if (root) root.inert = rootWasInert;
      }
      if (entry.restoreFocus instanceof HTMLElement && entry.restoreFocus.isConnected) entry.restoreFocus.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const element = layerRef.current;
      if (!element || stack[stack.length - 1]?.element !== element) return;
      if (event.key === "Escape" && dismissibleRef.current) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key === "Tab") {
        const focusables = Array.from(element.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ));
        if (!focusables.length) {
          event.preventDefault();
          element.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return createPortal(
    <div ref={layerRef} data-modal-layer="true" tabIndex={-1} className="fixed inset-0" style={{ zIndex: 1000 }}>
      {children}
    </div>,
    document.body
  );
};
