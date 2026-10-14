import { useCallback, useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";

export default function SearchableDropdown({
  value = null,

  onChange,

  fetchOptions,

  getOptionLabel = (option) => option?.name ?? "",

  getOptionValue = (option) => option?.id ?? "",

  placeholder = "Select an option",

  searchPlaceholder = "Search...",

  emptyMessage = "No matching options found.",

  loadingMessage = "Loading...",

  disabled = false,

  minSearchLength = 0,

  className = "",
}) {
  const rootRef = useRef(null);

  const triggerRef = useRef(null);

  const menuRef = useRef(null);

  const searchRef = useRef(null);

  const fetchOptionsRef = useRef(fetchOptions);

  const requestIdRef = useRef(0);

  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const [options, setOptions] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [activeIndex, setActiveIndex] = useState(-1);

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof document === "undefined") return false;

    return (
      document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark")
    );
  });

  const [position, setPosition] = useState({
    top: 0,

    left: 0,

    width: 0,

    maxHeight: 280,

    placement: "bottom",
  });

  // Always use the latest callback from the parent.

  useEffect(() => {
    fetchOptionsRef.current = fetchOptions;
  }, [fetchOptions]);

  // Observe the application's light/dark theme.

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const updateTheme = () => {
      setDarkMode(
        document.documentElement.classList.contains("dark") ||
          document.body.classList.contains("dark"),
      );
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);

    observer.observe(document.documentElement, {
      attributes: true,

      attributeFilter: ["class", "data-theme"],
    });

    observer.observe(document.body, {
      attributes: true,

      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const selectedLabel = value ? getOptionLabel(value) : "";

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const viewportHeight = window.innerHeight;

    const viewportWidth = window.innerWidth;

    const gap = 6;

    const edgePadding = 8;

    const spaceBelow = viewportHeight - rect.bottom - gap - edgePadding;

    const spaceAbove = rect.top - gap - edgePadding;

    const placement =
      spaceBelow >= 180 || spaceBelow >= spaceAbove ? "bottom" : "top";

    const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;

    const maxHeight = Math.max(
      100,

      Math.min(280, availableHeight),
    );

    const width = Math.min(rect.width, viewportWidth - edgePadding);

    const left = Math.max(
      edgePadding,

      Math.min(rect.left, viewportWidth - width - edgePadding),
    );

    setPosition({
      top:
        placement === "bottom"
          ? rect.bottom + gap
          : Math.max(edgePadding, rect.top - gap - maxHeight),

      left,

      width,

      maxHeight,

      placement,
    });
  }, []);

  const loadOptions = useCallback(
    async (query, signal) => {
      const requestId = ++requestIdRef.current;

      if (query.trim().length < minSearchLength) {
        setOptions([]);

        setLoading(false);

        setError("");

        return;
      }

      setLoading(true);

      setError("");

      try {
        const result = await fetchOptionsRef.current?.(query, {
          signal,
        });

        if (signal?.aborted || requestId !== requestIdRef.current) {
          return;
        }

        setOptions(Array.isArray(result) ? result : []);

        setActiveIndex(-1);
      } catch (err) {
        if (
          signal?.aborted ||
          err?.name === "AbortError" ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setOptions([]);

        setError("Unable to load options. Please try again.");
      } finally {
        if (!signal?.aborted && requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },

    [minSearchLength],
  );

  // Debounce searching and cancel the previous request.

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      loadOptions(search, controller.signal);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);

      controller.abort();
    };
  }, [open, search, loadOptions]);

  // Position the menu outside parent overflow containers.

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const handleLayoutChange = () => updatePosition();

    window.addEventListener("resize", handleLayoutChange);

    window.addEventListener("scroll", handleLayoutChange, true);

    return () => {
      window.removeEventListener("resize", handleLayoutChange);

      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [open, updatePosition]);

  // Close on an outside click.

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (
        rootRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);

      setActiveIndex(-1);
    };

    document.addEventListener("mousedown", handleOutsideClick);

    document.addEventListener("touchstart", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);

      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        searchRef.current?.focus();

        updatePosition();
      });
    }
  }, [open, updatePosition]);

  const closeDropdown = () => {
    setOpen(false);

    setActiveIndex(-1);
  };

  const handleSelect = (option) => {
    onChange?.(option);

    setSearch("");

    closeDropdown();
  };

  const handleClear = (event) => {
    event.stopPropagation();

    onChange?.(null);

    setSearch("");

    setOptions([]);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();

      closeDropdown();

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);

        return;
      }

      setActiveIndex((current) => Math.min(current + 1, options.length - 1));

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) => Math.max(current - 1, 0));

      return;
    }

    if (
      event.key === "Enter" &&
      open &&
      activeIndex >= 0 &&
      options[activeIndex]
    ) {
      event.preventDefault();

      handleSelect(options[activeIndex]);
    }
  };

  const theme = darkMode
    ? {
        trigger:
          "bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-400",

        menu: "bg-slate-900 border-slate-700 text-slate-100",

        search:
          "bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400",

        divider: "border-slate-700",

        muted: "text-slate-400",

        optionHover: "hover:bg-slate-800",

        optionActive: "bg-indigo-950 text-indigo-200",

        selected: "bg-indigo-950/70 text-indigo-200",

        check: "text-indigo-400",

        error: "text-red-400",
      }
    : {
        trigger:
          "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400",

        menu: "bg-white border-slate-200 text-slate-800",

        search:
          "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400",

        divider: "border-slate-100",

        muted: "text-slate-500",

        optionHover: "hover:bg-indigo-50",

        optionActive: "bg-indigo-50 text-indigo-800",

        selected: "bg-indigo-50 text-indigo-800",

        check: "text-indigo-600",

        error: "text-red-600",
      };

  return (
    <div ref={rootRef} className={`relative w-full min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;

          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          "flex min-h-[40px] w-full items-center justify-between gap-3",

          "rounded-lg border px-4 py-2 text-left text-sm shadow-none",

          "outline-none transition-colors",

          "focus:border-slate-300 focus:ring-0 focus:outline-none",

          "disabled:cursor-not-allowed disabled:opacity-50",

          theme.trigger,
        ].join(" ")}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selectedLabel ? "" : theme.muted
          }`}
        >
          {selectedLabel || placeholder}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={handleClear}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();

                  handleClear(event);
                }
              }}
              className={`rounded p-0.5 ${theme.muted} hover:text-red-500`}
            >
              <X size={15} />
            </span>
          )}

          <ChevronDown
            size={17}
            className={`shrink-0 transition-transform ${
              open ? "rotate-180" : ""
            } ${theme.muted}`}
          />
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",

              top: position.top,

              left: position.left,

              width: position.width,

              maxHeight: position.maxHeight,

              zIndex: 99999,
            }}
            className={[
              "overflow-hidden rounded-lg border shadow-lg",

              theme.menu,
            ].join(" ")}
          >
            <div className={`border-b p-2 ${theme.divider}`}>
              <div className="relative">
                <Search
                  size={16}
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${theme.muted}`}
                />

                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className={[
                    "w-full rounded-md border py-2 pl-9 pr-3",

                    "text-sm outline-none transition-colors",

                    "focus:border-slate-300 focus:ring-0 focus:outline-none",

                    theme.search,
                  ].join(" ")}
                />
              </div>
            </div>

            <div
              role="listbox"
              aria-label={placeholder}
              style={{ maxHeight: Math.max(80, position.maxHeight - 65) }}
              className="overflow-y-auto overscroll-contain p-1.5"
            >
              {loading && (
                <div
                  className={`flex items-center justify-center gap-2 px-3 py-5 text-sm ${theme.muted}`}
                >
                  <LoaderCircle size={16} className="animate-spin" />

                  {loadingMessage}
                </div>
              )}

              {!loading && error && (
                <div className={`px-3 py-4 text-center text-sm ${theme.error}`}>
                  {error}

                  <button
                    type="button"
                    onClick={() => setSearch((current) => `${current}`)}
                    className="ml-2 font-medium underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loading && !error && options.length === 0 && (
                <div className={`px-3 py-5 text-center text-sm ${theme.muted}`}>
                  {emptyMessage}
                </div>
              )}

              {!loading &&
                !error &&
                options.map((option, index) => {
                  const optionValue = getOptionValue(option);

                  const selectedValue = value ? getOptionValue(value) : null;

                  const isSelected =
                    selectedValue != null &&
                    String(optionValue) === String(selectedValue);

                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={String(optionValue ?? index)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => handleSelect(option)}
                      className={[
                        "flex w-full items-center justify-between gap-3",

                        "rounded-md px-3 py-2 text-left text-sm",

                        "transition-colors",

                        isSelected
                          ? theme.selected
                          : isActive
                            ? theme.optionActive
                            : theme.optionHover,
                      ].join(" ")}
                    >
                      <span className="min-w-0 flex-1 break-words">
                        {getOptionLabel(option)}
                      </span>

                      {isSelected && (
                        <Check
                          size={16}
                          className={`shrink-0 ${theme.check}`}
                        />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>,

          document.body,
        )}
    </div>
  );
}
